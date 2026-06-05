import os
from uuid import uuid4

from flask import Blueprint, current_app, flash, redirect, render_template, url_for
from flask_login import current_user
from werkzeug.utils import secure_filename

from app import db
from app.decorators import reporter_required
from app.forms import IncidentReportForm
from app.models import AuditLog, Evidence, Incident, IncidentType, Notification, SeverityEnum, StatusEnum


reporter_bp = Blueprint("reporter", __name__, url_prefix="/reporter")


def _create_audit_log(user_id, action, description):
    db.session.add(AuditLog(user_id=user_id, action=action, description=description))


def _create_notification(user_id, title, message):
    db.session.add(Notification(user_id=user_id, title=title, message=message))


@reporter_bp.route("/dashboard")
@reporter_required
def dashboard():
    incidents = Incident.query.filter_by(reported_by=current_user.user_id).order_by(Incident.created_at.desc()).all()
    stats = {
        "submitted": len(incidents),
        "open": sum(1 for item in incidents if item.status not in [StatusEnum.Resolved, StatusEnum.Closed]),
        "closed": sum(1 for item in incidents if item.status in [StatusEnum.Resolved, StatusEnum.Closed]),
    }
    critical_count = sum(1 for item in incidents if item.severity == SeverityEnum.Critical and item.status not in [StatusEnum.Resolved, StatusEnum.Closed])
    return render_template("reporter/dashboard.html", title="Reporter Dashboard", stats=stats, incidents=incidents[:8], critical_count=critical_count)


@reporter_bp.route("/report", methods=["GET", "POST"])
@reporter_required
def report_incident():
    form = IncidentReportForm()
    types = IncidentType.query.order_by(IncidentType.type_name).all()
    form.type_id.choices = [(item.type_id, item.type_name) for item in types]
    if not form.severity.data:
        form.severity.data = "Medium"
    if form.validate_on_submit():
        incident = Incident(
            title=form.title.data.strip(),
            description=form.description.data.strip(),
            severity=SeverityEnum(form.severity.data),
            status=StatusEnum.Open,
            type_id=form.type_id.data,
            reported_by=current_user.user_id,
        )
        db.session.add(incident)
        db.session.flush()
        upload = form.evidence.data
        if upload and upload.filename:
            original_name = secure_filename(upload.filename)
            stored_name = f"{uuid4().hex}_{original_name}"
            incident_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], str(incident.incident_id))
            os.makedirs(incident_dir, exist_ok=True)
            absolute_path = os.path.join(incident_dir, stored_name)
            upload.save(absolute_path)
            file_size = os.path.getsize(absolute_path)
            evidence = Evidence(
                incident_id=incident.incident_id,
                uploaded_by=current_user.user_id,
                file_name=original_name,
                file_path=f"uploads/{incident.incident_id}/{stored_name}",
                file_size=file_size,
            )
            db.session.add(evidence)
        _create_audit_log(current_user.user_id, "Incident Creation", f"Created incident SX-{incident.incident_id:05d}")
        db.session.commit()
        flash(f"Incident SX-{incident.incident_id:05d} transmitted to SentinelX.", "success")
        return redirect(url_for("reporter.my_incidents"))
    return render_template("reporter/report_incident.html", title="Report Incident", form=form, types=types)


@reporter_bp.route("/incidents")
@reporter_required
def my_incidents():
    incidents = Incident.query.filter_by(reported_by=current_user.user_id).order_by(Incident.created_at.desc()).all()
    return render_template("reporter/my_incidents.html", title="My Incidents", incidents=incidents)


@reporter_bp.route("/incidents/<int:id>")
@reporter_required
def incident_detail(id):
    incident = Incident.query.filter_by(incident_id=id, reported_by=current_user.user_id).first_or_404()
    return render_template("reporter/incident_detail.html", title=f"SX-{id:05d}", incident=incident)


@reporter_bp.route("/profile", methods=["GET", "POST"])
@reporter_required
def profile():
    from app.auth.routes import auth_bp
    return auth_bp.view_functions["profile"]()
