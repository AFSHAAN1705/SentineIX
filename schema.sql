CREATE TYPE user_role AS ENUM ('reporter', 'analyst', 'admin');
CREATE TYPE incident_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE incident_status AS ENUM ('Open', 'Assigned', 'Investigating', 'Under Review', 'Resolved', 'Closed');
CREATE TYPE threat_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role user_role NOT NULL DEFAULT 'reporter',
    profile_picture VARCHAR(500),
    last_login TIMESTAMPTZ,
    theme_preference VARCHAR(10) DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_user_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT ck_user_theme CHECK (theme_preference IN ('dark', 'light'))
);

CREATE TABLE incident_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    weight INTEGER DEFAULT 5,
    CONSTRAINT ck_type_weight CHECK (weight >= 1 AND weight <= 20)
);

CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    severity incident_severity NOT NULL,
    status incident_status NOT NULL DEFAULT 'Open',
    type_id INTEGER NOT NULL REFERENCES incident_types(type_id) ON UPDATE CASCADE,
    reported_by INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_incident_title CHECK (char_length(title) >= 5),
    CONSTRAINT ck_incident_description CHECK (char_length(description) >= 10)
);

CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    incident_id INTEGER UNIQUE NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    analyst_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE investigation_notes (
    note_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    analyst_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evidence (
    evidence_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE status_logs (
    log_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    old_status incident_status,
    new_status incident_status NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE resolutions (
    resolution_id SERIAL PRIMARY KEY,
    incident_id INTEGER UNIQUE NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    analyst_id INTEGER NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE,
    resolution_text TEXT NOT NULL,
    resolution_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_to_resolve_hours NUMERIC(10, 2) NOT NULL CHECK (time_to_resolve_hours >= 0),
    CONSTRAINT uq_resolutions_incident_id UNIQUE (incident_id)
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE threat_feeds (
    threat_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity threat_severity NOT NULL DEFAULT 'Medium',
    source VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite Indexes for Query Optimization
CREATE INDEX ix_incidents_status ON incidents(status);
CREATE INDEX ix_incidents_severity ON incidents(severity);
CREATE INDEX ix_incidents_reported_by ON incidents(reported_by);
CREATE INDEX ix_incidents_type_status ON incidents(type_id, status);
CREATE INDEX ix_incidents_severity_status ON incidents(severity, status);
CREATE INDEX ix_assignments_analyst_id ON assignments(analyst_id);
CREATE INDEX ix_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX ix_notifications_created_at ON notifications(created_at);
CREATE INDEX ix_audit_logs_action ON audit_logs(action);
CREATE INDEX ix_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX ix_threat_feeds_severity ON threat_feeds(severity);
CREATE INDEX ix_threat_feeds_created_at ON threat_feeds(created_at);

-- Views
CREATE VIEW vw_open_incidents AS
SELECT
    i.incident_id,
    i.title,
    i.severity,
    i.status,
    it.type_name,
    reporter.full_name AS reporter_name,
    analyst.full_name AS assigned_analyst,
    i.created_at,
    i.updated_at
FROM incidents i
JOIN incident_types it ON it.type_id = i.type_id
JOIN users reporter ON reporter.user_id = i.reported_by
LEFT JOIN assignments a ON a.incident_id = i.incident_id
LEFT JOIN users analyst ON analyst.user_id = a.analyst_id
WHERE i.status NOT IN ('Resolved', 'Closed');

CREATE VIEW vw_analyst_workload AS
SELECT
    u.user_id AS analyst_id,
    u.full_name AS analyst_name,
    COUNT(a.assignment_id) FILTER (WHERE i.status IN ('Assigned', 'Investigating', 'Under Review')) AS active_incident_count
FROM users u
LEFT JOIN assignments a ON a.analyst_id = u.user_id
LEFT JOIN incidents i ON i.incident_id = a.incident_id
WHERE u.role = 'analyst'
GROUP BY u.user_id, u.full_name;

CREATE VIEW vw_monthly_trends AS
SELECT
    EXTRACT(MONTH FROM created_at)::INT AS month,
    EXTRACT(YEAR FROM created_at)::INT AS year,
    COUNT(*)::INT AS incident_count
FROM incidents
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
ORDER BY year, month;

CREATE VIEW vw_resolution_times AS
SELECT
    i.incident_id,
    i.title,
    u.full_name AS analyst_name,
    r.time_to_resolve_hours
FROM resolutions r
JOIN incidents i ON i.incident_id = r.incident_id
JOIN users u ON u.user_id = r.analyst_id;

CREATE VIEW vw_incident_risk_scores AS
SELECT
    i.incident_id,
    i.title,
    i.severity,
    i.status,
    CASE
        WHEN i.severity = 'Critical' THEN 70
        WHEN i.severity = 'High' THEN 45
        WHEN i.severity = 'Medium' THEN 25
        ELSE 10
    END +
    COALESCE(it.weight, 5) +
    LEAST(EXTRACT(EPOCH FROM (NOW() - i.created_at)) / 3600 / 24 * 2, 25) AS risk_score
FROM incidents i
JOIN incident_types it ON it.type_id = i.type_id;

CREATE VIEW vw_audit_trail AS
SELECT
    al.log_id,
    u.full_name AS user_name,
    u.role,
    al.action,
    al.description,
    al.timestamp
FROM audit_logs al
JOIN users u ON u.user_id = al.user_id
ORDER BY al.timestamp DESC;

-- Trigger Function: Auto-update updated_at on incidents
CREATE OR REPLACE FUNCTION set_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function: Auto-log status changes
CREATE OR REPLACE FUNCTION insert_status_log()
RETURNS TRIGGER AS $$
DECLARE
    actor_id INTEGER;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        actor_id := COALESCE(NULLIF(current_setting('sentinelx.changed_by', TRUE)::INTEGER, 0), 1);
        INSERT INTO status_logs(incident_id, old_status, new_status, changed_by, reason)
        VALUES (NEW.incident_id, OLD.status, NEW.status, actor_id, 'Database trigger status transition');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on incidents
CREATE TRIGGER trg_updated_at
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION set_incident_updated_at();

-- Trigger: Auto-log status changes on incidents
CREATE TRIGGER trg_status_log
AFTER UPDATE OF status ON incidents
FOR EACH ROW
EXECUTE FUNCTION insert_status_log();

-- Stored Procedure: Assign incident to analyst
CREATE OR REPLACE FUNCTION fn_assign_incident(p_incident_id INTEGER, p_analyst_id INTEGER, p_assigned_by_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('sentinelx.changed_by', p_assigned_by_id::TEXT, TRUE);

    INSERT INTO assignments(incident_id, analyst_id, assigned_by)
    VALUES (p_incident_id, p_analyst_id, p_assigned_by_id)
    ON CONFLICT (incident_id)
    DO UPDATE SET analyst_id = EXCLUDED.analyst_id, assigned_by = EXCLUDED.assigned_by, assigned_at = NOW();

    UPDATE incidents
    SET status = 'Assigned'
    WHERE incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Resolve incident
CREATE OR REPLACE FUNCTION fn_resolve_incident(p_incident_id INTEGER, p_analyst_id INTEGER, p_resolution_text TEXT)
RETURNS VOID AS $$
DECLARE
    hours_to_resolve NUMERIC(10, 2);
BEGIN
    PERFORM set_config('sentinelx.changed_by', p_analyst_id::TEXT, TRUE);

    SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600, 2)
    INTO hours_to_resolve
    FROM incidents
    WHERE incident_id = p_incident_id;

    INSERT INTO resolutions(incident_id, analyst_id, resolution_text, time_to_resolve_hours)
    VALUES (p_incident_id, p_analyst_id, p_resolution_text, hours_to_resolve)
    ON CONFLICT (incident_id)
    DO UPDATE SET analyst_id = EXCLUDED.analyst_id,
                  resolution_text = EXCLUDED.resolution_text,
                  resolution_date = NOW(),
                  time_to_resolve_hours = EXCLUDED.time_to_resolve_hours;

    UPDATE incidents
    SET status = 'Resolved'
    WHERE incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: Get analyst stats
CREATE OR REPLACE FUNCTION fn_get_analyst_stats(p_analyst_id INTEGER)
RETURNS JSON AS $$
DECLARE
    payload JSON;
BEGIN
    SELECT json_build_object(
        'assigned_count', (SELECT COUNT(*) FROM assignments WHERE analyst_id = p_analyst_id),
        'resolved_count', (SELECT COUNT(*) FROM resolutions WHERE analyst_id = p_analyst_id),
        'avg_resolution_hours', COALESCE((SELECT ROUND(AVG(time_to_resolve_hours), 2) FROM resolutions WHERE analyst_id = p_analyst_id), 0)
    )
    INTO payload;
    RETURN payload;
END;
$$ LANGUAGE plpgsql;

-- Seed Data
INSERT INTO incident_types(type_name, description, weight) VALUES
('Phishing', 'Fraudulent message or site attempting to capture credentials.', 5),
('Malware', 'Malicious software detected on an endpoint or server.', 8),
('Ransomware', 'Encryption or extortion attempt against business assets.', 15),
('DDoS', 'Distributed denial of service activity.', 7),
('Data Breach', 'Unauthorized disclosure or access to sensitive data.', 12),
('Credential Theft', 'Stolen, leaked, or abused credentials.', 10),
('Insider Threat', 'Risk or abuse from authorized internal access.', 14),
('Unauthorized Access', 'Access attempt or session outside approved policy.', 9),
('Social Engineering', 'Human-targeted manipulation or impersonation.', 6),
('Zero-Day Exploit', 'Attack using a previously unknown vulnerability.', 18)
ON CONFLICT (type_name) DO NOTHING;
