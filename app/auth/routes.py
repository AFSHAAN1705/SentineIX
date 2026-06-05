from datetime import datetime, timezone

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_user, logout_user

from app import db
from app.forms import ChangePasswordForm, LoginForm, ProfileForm, RegisterForm
from app.models import AuditLog, Notification, RoleEnum, User


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _create_notification(user_id, title, message):
    db.session.add(Notification(user_id=user_id, title=title, message=message))


def _create_audit_log(user_id, action, description):
    db.session.add(AuditLog(user_id=user_id, action=action, description=description))


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(current_user.dashboard_endpoint)
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower().strip()).first()
        if user and user.is_active and user.check_password(form.password.data):
            user.last_login = datetime.now(timezone.utc)
            _create_audit_log(user.user_id, "Login", f"User {user.email} logged in.")
            db.session.commit()
            login_user(user)
            flash("Identity verified. SentinelX session established.", "success")
            next_url = request.args.get("next", "")
            if not next_url.startswith("/"):
                next_url = user.dashboard_endpoint
            return redirect(next_url)
        flash("Invalid credentials or inactive account.", "danger")
    return render_template("auth/login.html", title="Login", form=form)


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(current_user.dashboard_endpoint)
    form = RegisterForm()
    if form.validate_on_submit():
        email = form.email.data.lower().strip()
        if User.query.filter_by(email=email).first():
            flash("That email is already registered.", "warning")
            return render_template("auth/register.html", title="Register", form=form)
        user = User(full_name=form.full_name.data.strip(), email=email, role=RoleEnum.reporter)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash("Reporter account created. Log in to submit incidents.", "success")
        return redirect(url_for("auth.login"))
    return render_template("auth/register.html", title="Register", form=form)


@auth_bp.route("/logout")
def logout():
    if current_user.is_authenticated:
        _create_audit_log(current_user.user_id, "Logout", f"User {current_user.email} logged out.")
        db.session.commit()
    logout_user()
    flash("Session terminated.", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/profile", methods=["GET", "POST"])
def profile():
    form = ProfileForm(obj=current_user)
    password_form = ChangePasswordForm()
    if form.validate_on_submit() and request.form.get("form_type") == "profile":
        current_user.full_name = form.full_name.data.strip()
        current_user.email = form.email.data.lower().strip()
        upload = form.profile_picture.data
        if upload and upload.filename:
            from uuid import uuid4
            from werkzeug.utils import secure_filename
            import os
            from flask import current_app
            original_name = secure_filename(upload.filename)
            stored_name = f"profile_{current_user.user_id}_{uuid4().hex}_{original_name}"
            profile_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "profiles")
            os.makedirs(profile_dir, exist_ok=True)
            path = os.path.join(profile_dir, stored_name)
            upload.save(path)
            current_user.profile_picture = f"uploads/profiles/{stored_name}"
        _create_audit_log(current_user.user_id, "Profile Update", f"User {current_user.email} updated profile.")
        db.session.commit()
        flash("Profile updated.", "success")
        return redirect(url_for("auth.profile"))
    if password_form.validate_on_submit() and request.form.get("form_type") == "password":
        if not current_user.check_password(password_form.current_password.data):
            flash("Current password is incorrect.", "danger")
        else:
            current_user.set_password(password_form.new_password.data)
            _create_audit_log(current_user.user_id, "Password Change", f"User {current_user.email} changed password.")
            db.session.commit()
            flash("Password changed successfully.", "success")
            return redirect(url_for("auth.profile"))
    return render_template("auth/profile.html", title="Profile", form=form, password_form=password_form)
