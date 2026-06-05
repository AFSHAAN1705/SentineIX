from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import choice, randint, seed as random_seed

from app import create_app, db
from app.models import (
    Assignment,
    AuditLog,
    Evidence,
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


INCIDENT_TYPES = [
    ("Phishing", "Fraudulent message or site attempting to capture credentials."),
    ("Malware", "Malicious software detected on an endpoint or server."),
    ("Ransomware", "Encryption or extortion attempt against business assets."),
    ("DDoS", "Distributed denial of service activity."),
    ("Data Breach", "Unauthorized disclosure or access to sensitive data."),
    ("Credential Theft", "Stolen, leaked, or abused credentials."),
    ("Insider Threat", "Risk or abuse from authorized internal access."),
    ("Unauthorized Access", "Access attempt or session outside approved policy."),
    ("Social Engineering", "Human-targeted manipulation or impersonation."),
    ("Zero-Day Exploit", "Attack using a previously unknown vulnerability."),
]

THREAT_FEEDS = [
    ("CVE-2025-0147: Apache RCE", "Critical remote code execution vulnerability in Apache HTTP Server 2.4.x.", SeverityEnum.Critical, "CVE Database"),
    ("Emotet Resurgence Campaign", "Emotet botnet observed distributing new payloads via phishing campaigns.", SeverityEnum.High, "Threat Intelligence Feed"),
    ("MFA Bypass Technique Detected", "New adversary-in-the-middle phishing kit bypassing MFA on major platforms.", SeverityEnum.Critical, "Security Research"),
    ("Ransomware Gang Targets Healthcare", "ALPHV/BlackCat variant targeting healthcare organizations in North America.", SeverityEnum.High, "Threat Intel"),
    ("Supply Chain Attack on npm Packages", "Malicious packages discovered in npm registry targeting CI/CD pipelines.", SeverityEnum.Medium, "Open Source Intelligence"),
    ("DDoS Botnet Activity Increase", "Mirai variant observed recruiting IoT devices for amplified DDoS attacks.", SeverityEnum.Medium, "Network Monitoring"),
    ("Credential Stuffing Wave", "Large-scale credential stuffing attack targeting financial services APIs.", SeverityEnum.High, "SOC Alert"),
    ("New Phishing Kit Targets SSO", "Advanced phishing kit replicating Okta login flows with session cookie theft.", SeverityEnum.Critical, "Threat Intelligence Feed"),
    ("IoT Botnet Reconnaissance", "Increased scanning activity on port 23/2323 from compromised IoT devices.", SeverityEnum.Low, "Honeypot Network"),
    ("Zero-Day in VPN Appliance", "Unpatched vulnerability in major VPN appliance being exploited in the wild.", SeverityEnum.Critical, "CVE Database"),
]


def make_user(full_name, email, password, role):
    user = User(full_name=full_name, email=email, role=role)
    user.set_password(password)
    return user


def run():
    random_seed(2025)
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        for type_name, description in INCIDENT_TYPES:
            db.session.add(IncidentType(type_name=type_name, description=description))
        db.session.flush()

        admin = make_user("Avery Cross", "admin@sentinelx.com", "Admin@1234", RoleEnum.admin)
        analysts = [
            make_user("Mira Shah", "analyst1@sentinelx.com", "Analyst@1234", RoleEnum.analyst),
            make_user("Noah Pierce", "analyst2@sentinelx.com", "Analyst@1234", RoleEnum.analyst),
            make_user("Iris Morgan", "analyst3@sentinelx.com", "Analyst@1234", RoleEnum.analyst),
        ]
        reporters = [
            make_user("Lena Ortiz", "lena.ortiz@example.com", "Reporter@1234", RoleEnum.reporter),
            make_user("Daniel Brooks", "daniel.brooks@example.com", "Reporter@1234", RoleEnum.reporter),
            make_user("Priya Nair", "priya.nair@example.com", "Reporter@1234", RoleEnum.reporter),
            make_user("Ethan Cole", "ethan.cole@example.com", "Reporter@1234", RoleEnum.reporter),
            make_user("Sara Ahmed", "sara.ahmed@example.com", "Reporter@1234", RoleEnum.reporter),
        ]
        db.session.add_all([admin, *analysts, *reporters])
        db.session.flush()

        types = IncidentType.query.all()
        titles = [
            "Suspicious MFA fatigue attack against finance",
            "Endpoint beaconing to known command host",
            "Credential dump discovered in public paste",
            "Abnormal outbound traffic from web tier",
            "Ransom note detected on shared drive",
            "Executive impersonation email campaign",
            "Unauthorized admin console login",
            "Customer data export anomaly",
            "Zero-day exploit probe on VPN gateway",
            "DDoS saturation on public API",
        ]
        severities = [SeverityEnum.Low, SeverityEnum.Medium, SeverityEnum.High, SeverityEnum.Critical]
        statuses = [
            StatusEnum.Open,
            StatusEnum.Assigned,
            StatusEnum.Investigating,
            StatusEnum.Under_Review,
            StatusEnum.Resolved,
            StatusEnum.Closed,
        ]

        upload_root = Path(app.config["UPLOAD_FOLDER"])
        upload_root.mkdir(parents=True, exist_ok=True)

        for index in range(35):
            status = statuses[index % len(statuses)]
            created_at = datetime.now(timezone.utc) - timedelta(days=randint(1, 150), hours=randint(1, 23))
            incident = Incident(
                title=f"{choice(titles)} #{index + 1}",
                description=(
                    "Reporter observed indicators requiring SOC validation. Affected assets, timestamps, "
                    "user context, and containment notes were captured for analyst review."
                ),
                severity=choice(severities),
                status=status,
                type_id=choice(types).type_id,
                reported_by=choice(reporters).user_id,
                created_at=created_at,
                updated_at=created_at + timedelta(hours=randint(1, 24)),
            )
            db.session.add(incident)
            db.session.flush()

            evidence_dir = upload_root / str(incident.incident_id)
            evidence_dir.mkdir(parents=True, exist_ok=True)
            evidence_file = evidence_dir / f"sample_{incident.incident_id}.log"
            evidence_file.write_text("SentinelX sample evidence artifact\n", encoding="utf-8")
            db.session.add(
                Evidence(
                    incident_id=incident.incident_id,
                    uploaded_by=incident.reported_by,
                    file_name=evidence_file.name,
                    file_path=f"uploads/{incident.incident_id}/{evidence_file.name}",
                    file_size=evidence_file.stat().st_size,
                )
            )

            if status != StatusEnum.Open:
                analyst = analysts[index % len(analysts)]
                db.session.add(
                    Assignment(incident_id=incident.incident_id, analyst_id=analyst.user_id, assigned_by=admin.user_id)
                )
                db.session.add(
                    InvestigationNote(
                        incident_id=incident.incident_id,
                        analyst_id=analyst.user_id,
                        note="Initial triage completed. Indicators enriched and containment owner notified.",
                    )
                )
                db.session.add(
                    Notification(
                        user_id=analyst.user_id,
                        title=f"New Assignment: SX-{incident.incident_id:05d}",
                        message=f"Assigned to {incident.title}.",
                    )
                )
                db.session.add(
                    Notification(
                        user_id=incident.reported_by,
                        title=f"Incident SX-{incident.incident_id:05d} Assigned",
                        message=f"Your incident has been assigned to {analyst.full_name}.",
                    )
                )
                db.session.add(
                    StatusLog(
                        incident_id=incident.incident_id,
                        old_status=StatusEnum.Open,
                        new_status=status,
                        changed_by=admin.user_id,
                        reason="Seeded workflow state",
                    )
                )
                db.session.add(
                    AuditLog(
                        user_id=admin.user_id,
                        action="Assignment",
                        description=f"Seeded assignment of SX-{incident.incident_id:05d} to {analyst.full_name}",
                    )
                )
                if status in [StatusEnum.Resolved, StatusEnum.Closed]:
                    resolved_at = incident.created_at + timedelta(hours=randint(6, 96))
                    hours = round((resolved_at - incident.created_at).total_seconds() / 3600, 2)
                    db.session.add(
                        Resolution(
                            incident_id=incident.incident_id,
                            analyst_id=analyst.user_id,
                            resolution_text="Threat contained, affected credentials rotated, and monitoring rule deployed.",
                            resolution_date=resolved_at,
                            time_to_resolve_hours=hours,
                        )
                    )

        for title, desc, sev, source in THREAT_FEEDS:
            db.session.add(ThreatFeed(title=title, description=desc, severity=sev, source=source))

        for user_obj in [admin] + analysts + reporters:
            db.session.add(
                AuditLog(user_id=user_obj.user_id, action="Login", description=f"User {user_obj.email} logged in.")
            )

        db.session.commit()
        print("SentinelX sample data loaded.")
        print("Admin: admin@sentinelx.com / Admin@1234")
        print("Analysts: analyst1@sentinelx.com, analyst2@sentinelx.com, analyst3@sentinelx.com / Analyst@1234")
        print("Reporters: reporter1-5 passwords: Reporter@1234")
        print(f"Total incidents: 35")
        print(f"Total threat feeds: {len(THREAT_FEEDS)}")


if __name__ == "__main__":
    run()
