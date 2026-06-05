from datetime import datetime, timezone
from enum import Enum

import bcrypt
from flask_login import UserMixin
from sqlalchemy import Index, UniqueConstraint, func, case, text

from app import db


def enum_values(enum_class):
    return [item.value for item in enum_class]


class RoleEnum(Enum):
    reporter = "reporter"
    analyst = "analyst"
    admin = "admin"


class SeverityEnum(Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class StatusEnum(Enum):
    Open = "Open"
    Assigned = "Assigned"
    Investigating = "Investigating"
    Under_Review = "Under Review"
    Resolved = "Resolved"
    Closed = "Closed"


class RiskLevelEnum(Enum):
    Low = "Low Risk"
    Medium = "Medium Risk"
    High = "High Risk"
    Critical = "Critical Risk"


class User(UserMixin, db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(
        db.Enum(RoleEnum, name="user_role", values_callable=enum_values),
        nullable=False,
        default=RoleEnum.reporter,
    )
    profile_picture = db.Column(db.String(500), default=None)
    last_login = db.Column(db.DateTime(timezone=True), default=None)
    theme_preference = db.Column(db.String(10), default="dark")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    reported_incidents = db.relationship("Incident", foreign_keys="Incident.reported_by", back_populates="reporter")
    assignments = db.relationship("Assignment", foreign_keys="Assignment.analyst_id", back_populates="analyst")
    assigned_actions = db.relationship("Assignment", foreign_keys="Assignment.assigned_by", back_populates="assigner")
    notes = db.relationship("InvestigationNote", back_populates="analyst")
    evidence_uploads = db.relationship("Evidence", back_populates="uploader")
    status_changes = db.relationship("StatusLog", back_populates="changer")
    resolutions = db.relationship("Resolution", back_populates="analyst")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = db.relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def get_id(self):
        return str(self.user_id)

    @property
    def dashboard_endpoint(self):
        return {
            RoleEnum.reporter: "/reporter/dashboard",
            RoleEnum.analyst: "/analyst/dashboard",
            RoleEnum.admin: "/admin/dashboard",
        }[self.role]

    @property
    def initials(self):
        parts = self.full_name.strip().split()
        return (parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")).upper()

    @property
    def unread_notifications_count(self):
        return Notification.query.filter_by(user_id=self.user_id, is_read=False).count()

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_active": self.is_active,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

    def __repr__(self):
        return f"<User {self.email}>"


class IncidentType(db.Model):
    __tablename__ = "incident_types"

    type_id = db.Column(db.Integer, primary_key=True)
    type_name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.Text)
    weight = db.Column(db.Integer, default=5)

    incidents = db.relationship("Incident", back_populates="incident_type")

    def to_dict(self):
        return {"type_id": self.type_id, "type_name": self.type_name, "description": self.description}

    def __repr__(self):
        return f"<IncidentType {self.type_name}>"


class Incident(db.Model):
    __tablename__ = "incidents"

    incident_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.Enum(SeverityEnum, name="incident_severity", values_callable=enum_values), nullable=False)
    status = db.Column(
        db.Enum(StatusEnum, name="incident_status", values_callable=enum_values),
        nullable=False,
        default=StatusEnum.Open,
    )
    type_id = db.Column(db.Integer, db.ForeignKey("incident_types.type_id"), nullable=False)
    reported_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    incident_type = db.relationship("IncidentType", back_populates="incidents")
    reporter = db.relationship("User", foreign_keys=[reported_by], back_populates="reported_incidents")
    assignment = db.relationship("Assignment", uselist=False, back_populates="incident", cascade="all, delete-orphan")
    notes = db.relationship("InvestigationNote", back_populates="incident", cascade="all, delete-orphan")
    evidence = db.relationship("Evidence", back_populates="incident", cascade="all, delete-orphan")
    status_logs = db.relationship("StatusLog", back_populates="incident", cascade="all, delete-orphan")
    resolution = db.relationship("Resolution", uselist=False, back_populates="incident", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_incidents_status", "status"),
        Index("ix_incidents_severity", "severity"),
        Index("ix_incidents_reported_by", "reported_by"),
    )

    @property
    def risk_score(self):
        severity_weights = {"Low": 10, "Medium": 25, "High": 45, "Critical": 70}
        severity_w = severity_weights.get(self.severity.value, 10)
        type_w = self.incident_type.weight if self.incident_type and self.incident_type.weight else 5
        hours_open = 0
        if self.created_at:
            now = datetime.now(timezone.utc)
            created = self.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            hours_open = (now - created).total_seconds() / 3600
        time_w = min(hours_open / 24 * 2, 25)
        total = severity_w + type_w + time_w
        if total >= 90:
            return {"score": round(total, 1), "level": "Critical Risk", "class": "critical"}
        elif total >= 65:
            return {"score": round(total, 1), "level": "High Risk", "class": "high"}
        elif total >= 40:
            return {"score": round(total, 1), "level": "Medium Risk", "class": "medium"}
        return {"score": round(total, 1), "level": "Low Risk", "class": "low"}

    def to_dict(self):
        return {
            "incident_id": self.incident_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "status": self.status.value,
            "type": self.incident_type.type_name if self.incident_type else None,
            "reported_by": self.reporter.full_name if self.reporter else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "risk_score": self.risk_score,
        }

    def __repr__(self):
        return f"<Incident SX-{self.incident_id:05d}>"


class Assignment(db.Model):
    __tablename__ = "assignments"

    assignment_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.incident_id"), unique=True, nullable=False)
    analyst_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    assigned_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    assigned_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    incident = db.relationship("Incident", back_populates="assignment")
    analyst = db.relationship("User", foreign_keys=[analyst_id], back_populates="assignments")
    assigner = db.relationship("User", foreign_keys=[assigned_by], back_populates="assigned_actions")

    __table_args__ = (Index("ix_assignments_analyst_id", "analyst_id"),)

    def to_dict(self):
        return {
            "assignment_id": self.assignment_id,
            "incident_id": self.incident_id,
            "analyst": self.analyst.full_name if self.analyst else None,
            "assigned_by": self.assigner.full_name if self.assigner else None,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
        }

    def __repr__(self):
        return f"<Assignment incident={self.incident_id} analyst={self.analyst_id}>"


class InvestigationNote(db.Model):
    __tablename__ = "investigation_notes"

    note_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.incident_id"), nullable=False)
    analyst_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    incident = db.relationship("Incident", back_populates="notes")
    analyst = db.relationship("User", back_populates="notes")

    def to_dict(self):
        return {
            "note_id": self.note_id,
            "incident_id": self.incident_id,
            "analyst": self.analyst.full_name if self.analyst else None,
            "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<InvestigationNote {self.note_id}>"


class Evidence(db.Model):
    __tablename__ = "evidence"

    evidence_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.incident_id"), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    uploaded_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    incident = db.relationship("Incident", back_populates="evidence")
    uploader = db.relationship("User", back_populates="evidence_uploads")

    def to_dict(self):
        return {
            "evidence_id": self.evidence_id,
            "incident_id": self.incident_id,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    def __repr__(self):
        return f"<Evidence {self.file_name}>"


class StatusLog(db.Model):
    __tablename__ = "status_logs"

    log_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.incident_id"), nullable=False)
    old_status = db.Column(db.Enum(StatusEnum, name="incident_status", values_callable=enum_values), nullable=True)
    new_status = db.Column(db.Enum(StatusEnum, name="incident_status", values_callable=enum_values), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    changed_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    reason = db.Column(db.Text)

    incident = db.relationship("Incident", back_populates="status_logs")
    changer = db.relationship("User", back_populates="status_changes")

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "incident_id": self.incident_id,
            "old_status": self.old_status.value if self.old_status else None,
            "new_status": self.new_status.value,
            "changed_by": self.changer.full_name if self.changer else None,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
            "reason": self.reason,
        }

    def __repr__(self):
        return f"<StatusLog incident={self.incident_id} {self.old_status}->{self.new_status}>"


class Resolution(db.Model):
    __tablename__ = "resolutions"

    resolution_id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.incident_id"), unique=True, nullable=False)
    analyst_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    resolution_text = db.Column(db.Text, nullable=False)
    resolution_date = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    time_to_resolve_hours = db.Column(db.Numeric(10, 2), nullable=False)

    incident = db.relationship("Incident", back_populates="resolution")
    analyst = db.relationship("User", back_populates="resolutions")

    __table_args__ = (UniqueConstraint("incident_id", name="uq_resolutions_incident_id"),)

    def to_dict(self):
        return {
            "resolution_id": self.resolution_id,
            "incident_id": self.incident_id,
            "analyst": self.analyst.full_name if self.analyst else None,
            "resolution_text": self.resolution_text,
            "resolution_date": self.resolution_date.isoformat() if self.resolution_date else None,
            "time_to_resolve_hours": float(self.time_to_resolve_hours) if self.time_to_resolve_hours else None,
        }

    def __repr__(self):
        return f"<Resolution incident={self.incident_id}>"


class Notification(db.Model):
    __tablename__ = "notifications"

    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
        Index("ix_notifications_created_at", "created_at"),
    )

    def to_dict(self):
        return {
            "notification_id": self.notification_id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Notification {self.notification_id} user={self.user_id}>"


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_timestamp", "timestamp"),
    )

    def to_dict(self):
        return {
            "log_id": self.log_id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "action": self.action,
            "description": self.description,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

    def __repr__(self):
        return f"<AuditLog {self.log_id} action={self.action}>"


class ThreatFeed(db.Model):
    __tablename__ = "threat_feeds"

    threat_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(
        db.Enum(SeverityEnum, name="threat_severity", values_callable=enum_values),
        nullable=False,
        default=SeverityEnum.Medium,
    )
    source = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_threat_feeds_severity", "severity"),
        Index("ix_threat_feeds_created_at", "created_at"),
    )

    def to_dict(self):
        return {
            "threat_id": self.threat_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<ThreatFeed {self.threat_id} {self.title}>"
