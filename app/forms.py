from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField
from wtforms import (
    BooleanField,
    HiddenField,
    IntegerField,
    PasswordField,
    SelectField,
    StringField,
    SubmitField,
    TextAreaField,
)
from wtforms.validators import DataRequired, EqualTo, Length, Optional, Regexp


class LoginForm(FlaskForm):
    email = StringField(
        "Email",
        validators=[DataRequired(), Regexp(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", message="Enter a valid email."), Length(max=255)],
    )
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Enter SOC")


class RegisterForm(FlaskForm):
    full_name = StringField("Full name", validators=[DataRequired(), Length(max=120)])
    email = StringField(
        "Email",
        validators=[DataRequired(), Regexp(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", message="Enter a valid email."), Length(max=255)],
    )
    password = PasswordField("Password", validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField(
        "Confirm password",
        validators=[DataRequired(), EqualTo("password", message="Passwords must match.")],
    )
    submit = SubmitField("Create Account")


class IncidentReportForm(FlaskForm):
    title = StringField("Incident title", validators=[DataRequired(), Length(max=180)])
    type_id = SelectField("Incident type", coerce=int, validators=[DataRequired()])
    severity = HiddenField("Severity", validators=[DataRequired()])
    description = TextAreaField("Description", validators=[DataRequired(), Length(min=20)])
    evidence = FileField(
        "Evidence",
        validators=[
            Optional(),
            FileAllowed(["jpg", "jpeg", "png", "pdf", "txt", "log", "zip", "csv"], "Unsupported file type."),
        ],
    )
    submit = SubmitField("Transmit Report")


class NoteForm(FlaskForm):
    note = TextAreaField("Investigation note", validators=[DataRequired(), Length(min=5)])
    status = SelectField(
        "Status",
        choices=[
            ("Assigned", "Assigned"),
            ("Investigating", "Investigating"),
            ("Under Review", "Under Review"),
            ("Resolved", "Resolved"),
            ("Closed", "Closed"),
        ],
    )
    severity = SelectField(
        "Severity",
        choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High"), ("Critical", "Critical")],
    )
    submit = SubmitField("Update Incident")


class ResolveForm(FlaskForm):
    resolution_text = TextAreaField("Resolution", validators=[DataRequired(), Length(min=20)])
    submit = SubmitField("Mark Resolved")


class AssignForm(FlaskForm):
    analyst_id = SelectField("Analyst", coerce=int, validators=[DataRequired()])
    submit = SubmitField("Assign")


class CsrfOnlyForm(FlaskForm):
    submit = SubmitField("Submit")


class SearchForm(FlaskForm):
    q = StringField("Search", validators=[Optional(), Length(max=200)])
    status = SelectField(
        "Status",
        choices=[("", "Any Status"), ("Open", "Open"), ("Assigned", "Assigned"), ("Investigating", "Investigating"), ("Under Review", "Under Review"), ("Resolved", "Resolved"), ("Closed", "Closed")],
        validators=[Optional()],
    )
    severity = SelectField(
        "Severity",
        choices=[("", "Any Severity"), ("Low", "Low"), ("Medium", "Medium"), ("High", "High"), ("Critical", "Critical")],
        validators=[Optional()],
    )
    type_id = SelectField("Type", coerce=int, validators=[Optional()])
    sort = SelectField(
        "Sort By",
        choices=[("created_at_desc", "Newest First"), ("created_at_asc", "Oldest First"), ("severity_desc", "Severity (High)"), ("severity_asc", "Severity (Low)"), ("title_asc", "Title A-Z"), ("title_desc", "Title Z-A")],
        validators=[Optional()],
    )
    submit = SubmitField("Search")


class ProfileForm(FlaskForm):
    full_name = StringField("Full name", validators=[DataRequired(), Length(max=120)])
    email = StringField(
        "Email",
        validators=[DataRequired(), Regexp(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", message="Enter a valid email."), Length(max=255)],
    )
    profile_picture = FileField(
        "Profile Picture",
        validators=[Optional(), FileAllowed(["jpg", "jpeg", "png", "gif"], "Images only.")],
    )
    submit = SubmitField("Update Profile")


class ChangePasswordForm(FlaskForm):
    current_password = PasswordField("Current password", validators=[DataRequired()])
    new_password = PasswordField("New password", validators=[DataRequired(), Length(min=8)])
    confirm_new_password = PasswordField(
        "Confirm new password",
        validators=[DataRequired(), EqualTo("new_password", message="Passwords must match.")],
    )
    submit = SubmitField("Change Password")


class ThreatFeedForm(FlaskForm):
    title = StringField("Threat title", validators=[DataRequired(), Length(max=200)])
    description = TextAreaField("Description", validators=[DataRequired(), Length(min=10)])
    severity = SelectField(
        "Severity",
        choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High"), ("Critical", "Critical")],
    )
    source = StringField("Source", validators=[DataRequired(), Length(max=200)])
    submit = SubmitField("Add Threat Feed")
