from decimal import Decimal
from datetime import datetime, timezone

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user
from sqlalchemy import func

from app import db
from app.decorators import analyst_required
from app.forms import NoteForm, ResolveForm, SearchForm
from app.models import (
    Assignment,
    AuditLog,
    Incident,
    IncidentType,
    InvestigationNote,
    Notification,
    Resolution,
    RoleEnum,
    SeverityEnum,
    StatusEnum,
    StatusLog,
    ThreatFeed,
    User,
)


analyst_bp = Blueprint("analyst", __name__, url_prefix="/analyst")


def _create_audit_log(user_id, action, description):
    db.session.add(AuditLog(user_id=user_id, action=action, description=description))


def _create_notification(user_id, title, message):
    db.session.add(Notification(user_id=user_id, title=title, message=message))


@analyst_bp.route("/dashboard")
@analyst_required
def dashboard():
    assigned = _assigned_query().all()
    stats = {
        "assigned": len(assigned),
        "investigating": sum(1 for item in assigned if item.status == StatusEnum.Investigating),
        "resolved": sum(1 for item in assigned if item.status == StatusEnum.Resolved),
    }
    notes = (
        InvestigationNote.query.filter_by(analyst_id=current_user.user_id)
        .order_by(InvestigationNote.created_at.desc())
        .limit(6)
        .all()
    )
    critical_count = sum(1 for item in assigned if item.severity == SeverityEnum.Critical)
    my_resolved = Resolution.query.filter_by(analyst_id=current_user.user_id).count()
    avg_time = (
        db.session.query(func.coalesce(func.avg(Resolution.time_to_resolve_hours), 0))
        .filter(Resolution.analyst_id == current_user.user_id)
        .scalar()
    )
    active_investigations = sum(1 for item in assigned if item.status in [StatusEnum.Investigating, StatusEnum.Under_Review])
    all_analysts = User.query.filter(User.role == RoleEnum.analyst, User.is_active == True).all()
    leaderboard = []
    for a in all_analysts:
        resolved_count = Resolution.query.filter_by(analyst_id=a.user_id).count()
        leaderboard.append({"name": a.full_name, "resolved": resolved_count})
    leaderboard.sort(key=lambda x: x["resolved"], reverse=True)
    return render_template(
        "analyst/dashboard.html",
        title="Analyst Dashboard",
        stats=stats,
        incidents=assigned[:10],
        notes=notes,
        critical_count=critical_count,
        my_resolved=my_resolved,
        avg_time=float(avg_time),
        active_investigations=active_investigations,
        leaderboard=leaderboard[:5],
    )


@analyst_bp.route("/assignments")
@analyst_required
def my_assignments():
    page = request.args.get("page", 1, type=int)
    per_page = 15
    sort = request.args.get("sort", "created_at_desc")
    query = _assigned_query()
    if sort == "created_at_asc":
        query = query.order_by(Incident.created_at.asc())
    elif sort == "severity_desc":
        query = query.order_by(Incident.severity.desc(), Incident.created_at.desc())
    elif sort == "severity_asc":
        query = query.order_by(Incident.severity.asc(), Incident.created_at.desc())
    else:
        query = query.order_by(Incident.created_at.desc())
    total = query.count()
    incidents = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = (total + per_page - 1) // per_page
    return render_template(
        "analyst/my_assignments.html",
        title="My Assignments",
        incidents=incidents,
        page=page,
        total_pages=total_pages,
        total=total,
        sort=sort,
    )


@analyst_bp.route("/incident/<int:id>", methods=["GET", "POST"])
@analyst_required
def incident_detail(id):
    incident = _assigned_query().filter(Incident.incident_id == id).first_or_404()
    note_form = NoteForm()
    resolve_form = ResolveForm()
    if request.method == "GET":
        note_form.status.data = incident.status.value
        note_form.severity.data = incident.severity.value
    if note_form.validate_on_submit():
        old_status = incident.status
        incident.status = StatusEnum(note_form.status.data)
        incident.severity = SeverityEnum(note_form.severity.data)
        db.session.add(
            InvestigationNote(
                incident_id=incident.incident_id,
                analyst_id=current_user.user_id,
                note=note_form.note.data.strip(),
            )
        )
        if old_status != incident.status:
            db.session.add(
                StatusLog(
                    incident_id=incident.incident_id,
                    old_status=old_status,
                    new_status=incident.status,
                    changed_by=current_user.user_id,
                    reason="Analyst workflow update",
                )
            )
            _create_notification(
                incident.reported_by,
                f"Incident SX-{incident.incident_id:05d} Status Changed",
                f"Status changed from {old_status.value} to {incident.status.value}.",
            )
        _create_audit_log(current_user.user_id, "Status Change", f"Changed SX-{incident.incident_id:05d} to {incident.status.value}")
        db.session.commit()
        flash("Incident intelligence updated.", "success")
        return redirect(url_for("analyst.incident_detail", id=id))
    return render_template(
        "analyst/incident_detail.html",
        title=f"SX-{id:05d}",
        incident=incident,
        note_form=note_form,
        resolve_form=resolve_form,
        lifecycle=["Open", "Assigned", "Investigating", "Under Review", "Resolved", "Closed"],
    )


@analyst_bp.route("/incident/<int:id>/resolve", methods=["POST"])
@analyst_required
def resolve_incident(id):
    incident = _assigned_query().filter(Incident.incident_id == id).first_or_404()
    form = ResolveForm()
    if form.validate_on_submit():
        old_status = incident.status
        incident.status = StatusEnum.Resolved
        resolution = incident.resolution
        if resolution:
            resolution.analyst_id = current_user.user_id
            resolution.resolution_text = form.resolution_text.data.strip()
            resolution.resolution_date = datetime.now(timezone.utc)
        else:
            resolution = Resolution(
                incident_id=incident.incident_id,
                analyst_id=current_user.user_id,
                resolution_text=form.resolution_text.data.strip(),
                time_to_resolve_hours=0,
            )
            db.session.add(resolution)
        db.session.flush()
        if resolution:
            resolved_at = resolution.resolution_date or datetime.now(timezone.utc)
            created_at = incident.created_at
            if resolved_at.tzinfo and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=resolved_at.tzinfo)
            elif created_at.tzinfo and resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=created_at.tzinfo)
            delta = resolved_at - created_at
            resolution.time_to_resolve_hours = Decimal(str(round(delta.total_seconds() / 3600, 2)))
        if old_status != incident.status:
            db.session.add(
                StatusLog(
                    incident_id=incident.incident_id,
                    old_status=old_status,
                    new_status=incident.status,
                    changed_by=current_user.user_id,
                    reason="Resolution submitted",
                )
            )
            _create_notification(
                incident.reported_by,
                f"Incident SX-{incident.incident_id:05d} Resolved",
                f"Incident has been resolved by {current_user.full_name}.",
            )
        _create_audit_log(current_user.user_id, "Resolution", f"Resolved SX-{incident.incident_id:05d}")
        db.session.commit()
        flash("Incident marked as resolved.", "success")
    else:
        flash("Resolution text must be at least 20 characters.", "danger")
    return redirect(url_for("analyst.incident_detail", id=id))


@analyst_bp.route("/threat-intel")
@analyst_required
def threat_intel():
    threats = ThreatFeed.query.order_by(ThreatFeed.created_at.desc()).all()
    stats = {
        "total": len(threats),
        "critical": sum(1 for t in threats if t.severity == SeverityEnum.Critical),
        "high": sum(1 for t in threats if t.severity == SeverityEnum.High),
    }
    return render_template("analyst/threat_intel.html", title="Threat Intelligence", threats=threats, stats=stats)


@analyst_bp.route("/profile", methods=["GET", "POST"])
@analyst_required
def profile():
    from app.auth.routes import auth_bp
    return auth_bp.view_functions["profile"]()


def _assigned_query():
    return (
        Incident.query.join(Incident.assignment)
        .filter(Assignment.analyst_id == current_user.user_id)
        .order_by(Incident.severity.desc(), Incident.created_at.desc())
    )
