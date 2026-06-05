from functools import wraps

from flask import abort
from flask_login import current_user, login_required


def role_required(*roles):
    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if not current_user.is_active or current_user.role.value not in roles:
                abort(403)
            return view(*args, **kwargs)

        return wrapped

    return decorator


reporter_required = role_required("reporter")
analyst_required = role_required("analyst")
admin_required = role_required("admin")

