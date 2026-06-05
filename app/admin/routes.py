import csv
import io
from collections import Counter, defaultdict
from datetime import datetime, timezone

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for, Response
from flask_login import current_user
from sqlalchemy import func, case, or_

from app import db
from app.decorators import admin_required
from app.forms import AssignForm, CsrfOnlyForm, SearchForm, ThreatFeedForm
from app.models import (
    Assignment,
    AuditLog,
    Incident,
    IncidentType,
    Notification,
    Resolution,
    RoleEnum,
    SeverityEnum,
    StatusEnum,
    StatusLog,
    ThreatFeed,
    User,
)


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def _create_audit_log(user_id, action, description):
    db.session.add(AuditLog(user_id=user_id, action=action, description=description))


def _create_notification(user_id, title, message):
    db.session.add(Notification(user_id=user_id, title=title, message=message))


@admin_bp.route("/dashboard")
@admin_required
def dashboard():
    incidents = Incident.query.order_by(Incident.created_at.desc()).all()
    analysts = User.query.filter_by(role=RoleEnum.analyst, is_active=True).all()
    stats = {
        "total": len(incidents),
        "open": sum(1 for item in incidents if item.status in [StatusEnum.Open, StatusEnum.Assigned, StatusEnum.Investigating]),
        "high_critical": sum(1 for item in incidents if item.severity in [SeverityEnum.High, SeverityEnum.Critical]),
        "analysts": len(analysts),
        "critical_open": sum(1 for item in incidents if item.severity == SeverityEnum.Critical and item.status not in [StatusEnum.Resolved, StatusEnum.Closed]),
        "resolved": sum(1 for item in incidents if item.status == StatusEnum.Resolved),
        "threats": ThreatFeed.query.count(),
    }
    critical_alerts = [i for i in incidents if i.severity == SeverityEnum.Critical and i.status not in [StatusEnum.Resolved, StatusEnum.Closed]][:5]
    return render_template(
        "admin/dashboard.html",
        title="Admin Dashboard",
        stats=stats,
        recent=incidents[:10],
        chart_data=_dashboard_chart_data(incidents, analysts),
        critical_alerts=critical_alerts,
    )


@admin_bp.route("/incidents")
@admin_required
def incidents():
    page = request.args.get("page", 1, type=int)
    per_page = 15
    query = Incident.query
    total_all = Incident.query.count()
    search = request.args.get("q", "").strip()
    if search:
        query = query.filter(
            or_(
                Incident.title.ilike(f"%{search}%"),
                Incident.incident_id.cast(db.String).ilike(f"%{search}%"),
            )
        )
    try:
        if request.args.get("status"):
            query = query.filter(Incident.status == StatusEnum(request.args["status"]))
        if request.args.get("severity"):
            query = query.filter(Incident.severity == SeverityEnum(request.args["severity"]))
        if request.args.get("type_id"):
            query = query.filter(Incident.type_id == int(request.args["type_id"]))
        if request.args.get("from"):
            query = query.filter(Incident.created_at >= datetime.strptime(request.args["from"], "%Y-%m-%d"))
        if request.args.get("to"):
            query = query.filter(Incident.created_at <= datetime.strptime(request.args["to"], "%Y-%m-%d"))
    except ValueError:
        flash("One or more filters were invalid and were ignored.", "warning")
    sort = request.args.get("sort", "created_at_desc")
    if sort == "created_at_asc":
        query = query.order_by(Incident.created_at.asc())
    elif sort == "severity_desc":
        query = query.order_by(Incident.severity.desc(), Incident.created_at.desc())
    elif sort == "title_asc":
        query = query.order_by(Incident.title.asc())
    elif sort == "title_desc":
        query = query.order_by(Incident.title.desc())
    else:
        query = query.order_by(Incident.created_at.desc())
    total = query.count()
    incidents_page = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = (total + per_page - 1) // per_page
    form = AssignForm()
    _hydrate_assign_form(form)
    return render_template(
        "admin/incidents.html",
        title="All Incidents",
        incidents=incidents_page,
        total=total,
        total_all=total_all,
        shown=len(incidents_page),
        types=IncidentType.query.order_by(IncidentType.type_name).all(),
        form=form,
        page=page,
        total_pages=total_pages,
        sort=sort,
    )


@admin_bp.route("/assign/<int:incident_id>", methods=["POST"])
@admin_required
def assign(incident_id):
    form = AssignForm()
    _hydrate_assign_form(form)
    incident = Incident.query.get_or_404(incident_id)
    if form.validate_on_submit():
        old_analyst = incident.assignment.analyst.full_name if incident.assignment else None
        if incident.assignment:
            incident.assignment.analyst_id = form.analyst_id.data
        else:
            db.session.add(
                Assignment(incident_id=incident.incident_id, analyst_id=form.analyst_id.data, assigned_by=current_user.user_id)
            )
        old_status = incident.status
        incident.status = StatusEnum.Assigned
        if old_status != incident.status:
            db.session.add(
                StatusLog(
                    incident_id=incident.incident_id,
                    old_status=old_status,
                    new_status=incident.status,
                    changed_by=current_user.user_id,
                    reason="Admin assignment",
                )
            )
        analyst = User.query.get(form.analyst_id.data)
        if analyst:
            _create_notification(
                analyst.user_id,
                f"New Assignment: SX-{incident.incident_id:05d}",
                f"You have been assigned to {incident.title} by {current_user.full_name}.",
            )
        _create_audit_log(current_user.user_id, "Assignment", f"Assigned SX-{incident.incident_id:05d} to {analyst.full_name if analyst else 'Unknown'}")
        db.session.commit()
        flash(f"SX-{incident.incident_id:05d} assigned.", "success")
    else:
        flash("Select a valid active analyst.", "danger")
    return redirect(url_for("admin.incidents", page=request.args.get("page", 1)))


@admin_bp.route("/reassign/<int:incident_id>", methods=["POST"])
@admin_required
def reassign(incident_id):
    return assign(incident_id)


@admin_bp.route("/users")
@admin_required
def users():
    form = CsrfOnlyForm()
    users_list = User.query.order_by(User.role, User.full_name).all()
    return render_template("admin/users.html", title="Users", users=users_list, form=form)


@admin_bp.route("/users/<int:id>/toggle", methods=["POST"])
@admin_required
def toggle_user(id):
    form = CsrfOnlyForm()
    user = User.query.get_or_404(id)
    if user.user_id == current_user.user_id:
        flash("You cannot deactivate your own command account.", "warning")
    elif form.validate_on_submit():
        user.is_active = not user.is_active
        action = "Activated" if user.is_active else "Deactivated"
        _create_audit_log(current_user.user_id, "User Management", f"{action} user {user.email}")
        db.session.commit()
        flash(f"{user.full_name} is now {'active' if user.is_active else 'inactive'}.", "success")
    return redirect(url_for("admin.users"))


@admin_bp.route("/reports")
@admin_required
def reports():
    incidents = Incident.query.order_by(Incident.created_at.desc()).all()
    resolutions = Resolution.query.order_by(Resolution.resolution_date.desc()).all()
    return render_template(
        "admin/reports.html",
        title="Reports",
        incidents=incidents,
        resolutions=resolutions,
        performance_rows=_analyst_performance_rows(),
        report_stats={
            "total": len(incidents),
            "open": sum(1 for item in incidents if item.status != StatusEnum.Closed),
            "resolved": sum(1 for item in incidents if item.status == StatusEnum.Resolved),
        },
        evidence_count=sum(len(item.evidence) for item in incidents),
        chart_data=_dashboard_chart_data(incidents, User.query.filter_by(role=RoleEnum.analyst).all()),
    )


@admin_bp.route("/reports/summary")
@admin_required
def report_summary():
    return jsonify(_summary_payload())


@admin_bp.route("/reports/analyst-performance")
@admin_required
def analyst_performance():
    return jsonify(_analyst_performance_rows())


@admin_bp.route("/threat-intel", methods=["GET", "POST"])
@admin_required
def threat_intel():
    form = ThreatFeedForm()
    if form.validate_on_submit():
        threat = ThreatFeed(
            title=form.title.data.strip(),
            description=form.description.data.strip(),
            severity=SeverityEnum(form.severity.data),
            source=form.source.data.strip(),
        )
        db.session.add(threat)
        _create_audit_log(current_user.user_id, "Threat Feed", f"Added threat: {threat.title}")
        db.session.commit()
        flash(f"Threat feed '{threat.title}' added.", "success")
        return redirect(url_for("admin.threat_intel"))
    threats = ThreatFeed.query.order_by(ThreatFeed.created_at.desc()).all()
    stats = {
        "total": len(threats),
        "critical": sum(1 for t in threats if t.severity == SeverityEnum.Critical),
        "high": sum(1 for t in threats if t.severity == SeverityEnum.High),
        "medium": sum(1 for t in threats if t.severity == SeverityEnum.Medium),
        "low": sum(1 for t in threats if t.severity == SeverityEnum.Low),
    }
    return render_template("admin/threat_intel.html", title="Threat Intelligence", threats=threats, stats=stats, form=form)


@admin_bp.route("/audit-logs")
@admin_required
def audit_logs():
    page = request.args.get("page", 1, type=int)
    per_page = 25
    action_filter = request.args.get("action", "")
    query = AuditLog.query
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    query = query.order_by(AuditLog.timestamp.desc())
    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = (total + per_page - 1) // per_page
    actions = [row[0] for row in db.session.query(AuditLog.action).distinct().order_by(AuditLog.action).all()]
    return render_template(
        "admin/audit_logs.html",
        title="Audit Logs",
        logs=logs,
        page=page,
        total_pages=total_pages,
        total=total,
        actions=actions,
        action_filter=action_filter,
    )


@admin_bp.route("/export-center")
@admin_required
def export_center():
    return render_template("admin/export_center.html", title="Export Center")


@admin_bp.route("/export/<export_type>")
@admin_required
def export_data(export_type):
    output = io.StringIO()
    writer = csv.writer(output)
    filename = f"{export_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    if export_type == "incidents":
        writer.writerow(["ID", "Title", "Type", "Severity", "Status", "Reporter", "Analyst", "Created", "Risk Score"])
        for inc in Incident.query.order_by(Incident.created_at.desc()).all():
            writer.writerow([
                f"SX-{inc.incident_id:05d}", inc.title, inc.incident_type.type_name if inc.incident_type else "",
                inc.severity.value, inc.status.value, inc.reporter.full_name if inc.reporter else "",
                inc.assignment.analyst.full_name if inc.assignment and inc.assignment.analyst else "",
                inc.created_at.strftime("%Y-%m-%d %H:%M") if inc.created_at else "",
                inc.risk_score["level"],
            ])
    elif export_type == "analysts":
        writer.writerow(["Analyst", "Assigned", "Resolved", "Avg Resolution Hours"])
        for row in _analyst_performance_rows():
            writer.writerow([row["analyst"], row["assigned"], row["resolved"], row["avg_hours"]])
    elif export_type == "monthly":
        writer.writerow(["Month", "Incidents"])
        for row in db.session.query(func.date_trunc("month", Incident.created_at), func.count(Incident.incident_id)).group_by(func.date_trunc("month", Incident.created_at)).order_by(func.date_trunc("month", Incident.created_at)).all():
            writer.writerow([row[0].strftime("%Y-%m") if row[0] else "Unknown", row[1]])
    elif export_type == "threats":
        writer.writerow(["ID", "Title", "Severity", "Source", "Created"])
        for t in ThreatFeed.query.order_by(ThreatFeed.created_at.desc()).all():
            writer.writerow([t.threat_id, t.title, t.severity.value, t.source, t.created_at.strftime("%Y-%m-%d") if t.created_at else ""])
    elif export_type == "audit":
        writer.writerow(["ID", "User", "Action", "Description", "Timestamp"])
        for log in AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(1000).all():
            writer.writerow([log.log_id, log.user.full_name if log.user else "", log.action, log.description, log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else ""])
    else:
        flash("Invalid export type.", "danger")
        return redirect(url_for("admin.export_center"))
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"},
    )


@admin_bp.route("/profile", methods=["GET", "POST"])
@admin_required
def profile():
    from app.auth.routes import auth_bp
    return auth_bp.view_functions["profile"]()


def _hydrate_assign_form(form):
    form.analyst_id.choices = [
        (user.user_id, f"{user.full_name} ({user.email})")
        for user in User.query.filter_by(role=RoleEnum.analyst, is_active=True).order_by(User.full_name).all()
    ]


def _dashboard_chart_data(incidents, analysts):
    severity_counts = Counter(item.severity.value for item in incidents)
    workload = {
        analyst.full_name: Assignment.query.filter_by(analyst_id=analyst.user_id).count()
        for analyst in analysts
    }
    monthly = defaultdict(int)
    for item in incidents:
        monthly[item.created_at.strftime("%Y-%m") if item.created_at else "Unknown"] += 1
    type_counts = Counter(item.incident_type.type_name for item in incidents if item.incident_type)
    resolution_times = [
        {"incident_id": r.incident_id, "time_to_resolve_hours": float(r.time_to_resolve_hours)}
        for r in Resolution.query.order_by(Resolution.time_to_resolve_hours.desc()).limit(15).all()
    ]
    analyst_perf = _analyst_performance_rows()
    return {
        "severity": severity_counts,
        "workload": workload,
        "monthly": dict(sorted(monthly.items())[-6:]),
        "types": type_counts,
        "resolutionTimes": resolution_times,
        "analystPerformance": analyst_perf,
    }


def _summary_payload():
    return {
        "incidents": Incident.query.count(),
        "open": Incident.query.filter(Incident.status != StatusEnum.Closed).count(),
        "resolved": Incident.query.filter_by(status=StatusEnum.Resolved).count(),
        "active_users": User.query.filter_by(is_active=True).count(),
    }


def _analyst_performance_rows():
    rows = []
    analysts = User.query.filter_by(role=RoleEnum.analyst).all()
    for analyst in analysts:
        rows.append(
            {
                "analyst": analyst.full_name,
                "assigned": Assignment.query.filter_by(analyst_id=analyst.user_id).count(),
                "resolved": Resolution.query.filter_by(analyst_id=analyst.user_id).count(),
                "avg_hours": float(
                    db.session.query(func.coalesce(func.avg(Resolution.time_to_resolve_hours), 0))
                    .filter(Resolution.analyst_id == analyst.user_id)
                    .scalar()
                ),
            }
        )
    return rows
