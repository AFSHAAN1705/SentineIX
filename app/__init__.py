import os

from flask import Flask, redirect, render_template, url_for
from flask_login import LoginManager, current_user
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect

from config import Config


db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
csrf = CSRFProtect()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Authentication required. SentinelX blocked anonymous access."
    login_manager.login_message_category = "warning"

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    from app.auth.routes import auth_bp
    from app.reporter.routes import reporter_bp
    from app.analyst.routes import analyst_bp
    from app.admin.routes import admin_bp
    from app.notifications.routes import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(reporter_bp)
    app.register_blueprint(analyst_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notifications_bp)

    @app.context_processor
    def inject_theme():
        if current_user.is_authenticated:
            return {"theme": current_user.theme_preference}
        return {"theme": "dark"}

    @app.route("/")
    def index():
        if not current_user.is_authenticated:
            return redirect(url_for("auth.login"))
        return redirect(current_user.dashboard_endpoint)

    @app.errorhandler(403)
    def forbidden(_error):
        return render_template("errors/403.html", title="Access Denied"), 403

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("errors/404.html", title="Signal Lost"), 404

    @app.errorhandler(500)
    def server_error(_error):
        db.session.rollback()
        return render_template("errors/500.html", title="System Fault"), 500

    return app
