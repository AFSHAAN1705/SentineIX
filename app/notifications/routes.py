from flask import Blueprint, jsonify
from flask_login import login_required, current_user

from app import db
from app.models import Notification


notifications_bp = Blueprint("notifications", __name__, url_prefix="/notifications")


@notifications_bp.route("/mark-read/<int:notification_id>", methods=["POST"])
@login_required
def mark_read(notification_id):
    notif = Notification.query.filter_by(notification_id=notification_id, user_id=current_user.user_id).first()
    if notif:
        notif.is_read = True
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"success": False}), 404


@notifications_bp.route("/mark-all-read", methods=["POST"])
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"success": True})


@notifications_bp.route("/api/unread-count")
@login_required
def unread_count():
    count = Notification.query.filter_by(user_id=current_user.user_id, is_read=False).count()
    return jsonify({"count": count, "show": count > 0})


@notifications_bp.route("/api/recent")
@login_required
def recent():
    notifs = (
        Notification.query.filter_by(user_id=current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(10)
        .all()
    )
    return jsonify([n.to_dict() for n in notifs])
