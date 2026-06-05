-- ============================================================
-- SentinelX Database — VIEWS
-- PostgreSQL 15+
-- Run: psql -U sentinelx -d sentinelx_db -f views.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- VIEW 1: v_incident_summary
-- Full incident overview joining reporter, type, analyst, resolution.
-- Used by: Dashboard, Reports, Admin panel.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_incident_summary AS
SELECT
    i.incident_id,
    i.incident_ref,
    i.title,
    i.description,
    i.severity,
    i.status,
    i.risk_score,
    i.risk_level,
    i.affected_users_count,
    i.affected_systems,
    i.source_ip,
    i.target_ip,
    i.location,
    i.created_at,
    i.resolved_at,
    -- Days the incident has been open (NULL if resolved)
    CASE
        WHEN i.status IN ('resolved', 'closed') THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - i.created_at)::INTEGER
    END AS days_open,
    -- Reporter info
    r.full_name          AS reporter_name,
    r.email              AS reporter_email,
    r.department         AS reporter_department,
    -- Incident type
    it.type_name         AS incident_type,
    it.severity_weight,
    -- Assigned analyst (most recent active assignment)
    a_user.full_name     AS analyst_name,
    a_user.email         AS analyst_email,
    -- Resolution summary
    res.root_cause,
    res.resolution_time_hours
FROM
    incidents i
    LEFT JOIN users        r      ON r.user_id     = i.reporter_id
    LEFT JOIN incident_types it   ON it.type_id    = i.type_id
    LEFT JOIN assignments  a      ON a.incident_id = i.incident_id AND a.is_active = TRUE
    LEFT JOIN users        a_user ON a_user.user_id = a.analyst_id
    LEFT JOIN resolutions  res    ON res.incident_id = i.incident_id;

COMMENT ON VIEW v_incident_summary IS
  'Full incident overview with reporter, analyst, type, and resolution data. Used for reports and dashboard.';


-- ─────────────────────────────────────────────────────────────
-- VIEW 2: v_active_threats
-- Lists all active threat feed entries with creator info.
-- Used by: Threat Intelligence page, analytics.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_active_threats AS
SELECT
    t.threat_id,
    t.title,
    t.description,
    t.threat_type,
    t.severity,
    t.source,
    t.cve_id,
    t.indicators,
    t.platforms,
    t.is_active,
    t.created_at,
    -- Creator details
    u.full_name  AS creator_name,
    u.email      AS creator_email,
    u.department AS creator_department,
    -- Count of indicator categories in JSONB
    (
        COALESCE(jsonb_array_length(t.indicators -> 'ips'), 0) +
        COALESCE(jsonb_array_length(t.indicators -> 'hashes'), 0) +
        COALESCE(jsonb_array_length(t.indicators -> 'domains'), 0)
    ) AS total_indicators
FROM
    threat_feeds t
    LEFT JOIN users u ON u.user_id = t.created_by
WHERE
    t.is_active = TRUE
ORDER BY
    CASE t.severity
        WHEN 'critical' THEN 1
        WHEN 'high'     THEN 2
        WHEN 'medium'   THEN 3
        WHEN 'low'      THEN 4
    END,
    t.created_at DESC;

COMMENT ON VIEW v_active_threats IS
  'Active threat intelligence feeds ordered by severity. Includes JSONB indicator counts.';


-- ─────────────────────────────────────────────────────────────
-- VIEW 3: v_analyst_workload
-- Per-analyst workload summary: assigned, open, resolved counts
-- and average risk score of their incidents.
-- Used by: Admin analytics, assignment console.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_analyst_workload AS
SELECT
    u.user_id       AS analyst_id,
    u.full_name     AS analyst_name,
    u.email         AS analyst_email,
    u.department,
    -- Total incidents ever assigned
    COUNT(a.assignment_id)                                                              AS total_assigned,
    -- Currently open (not resolved/closed)
    COUNT(a.assignment_id) FILTER (
        WHERE i.status NOT IN ('resolved', 'closed')
    )                                                                                   AS open_count,
    -- Resolved or closed
    COUNT(a.assignment_id) FILTER (
        WHERE i.status IN ('resolved', 'closed')
    )                                                                                   AS resolved_count,
    -- Average risk score across their assigned incidents
    ROUND(AVG(i.risk_score), 1)                                                        AS avg_risk_score,
    -- Most recent assignment date
    MAX(a.assigned_at)                                                                  AS last_assigned_at
FROM
    users       u
    JOIN roles  ro ON ro.role_id = u.role_id AND ro.role_name = 'analyst'
    LEFT JOIN assignments a  ON a.analyst_id  = u.user_id AND a.is_active = TRUE
    LEFT JOIN incidents   i  ON i.incident_id = a.incident_id
GROUP BY
    u.user_id, u.full_name, u.email, u.department
ORDER BY
    open_count DESC;

COMMENT ON VIEW v_analyst_workload IS
  'Per-analyst workload statistics including open, resolved, and average risk. Used for admin assignment console.';


-- ─────────────────────────────────────────────────────────────
-- VIEW 4: v_daily_incident_stats
-- Daily incident counts broken down by severity.
-- Used by: Trend charts, analytics dashboard.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_daily_incident_stats AS
SELECT
    DATE(i.created_at)                         AS incident_date,
    i.severity,
    COUNT(*)                                   AS incident_count,
    ROUND(AVG(i.risk_score), 1)                AS avg_risk_score,
    COUNT(*) FILTER (WHERE i.status IN ('resolved','closed')) AS resolved_count,
    COUNT(*) FILTER (WHERE i.status NOT IN ('resolved','closed')) AS open_count
FROM
    incidents i
GROUP BY
    DATE(i.created_at), i.severity
ORDER BY
    incident_date DESC, i.severity;

COMMENT ON VIEW v_daily_incident_stats IS
  'Daily incident counts by severity. Powers the trend line chart on the dashboard.';


-- ─────────────────────────────────────────────────────────────
-- VIEW 5: v_unresolved_critical
-- All HIGH and CRITICAL incidents not yet resolved.
-- Used by: Alerting, priority queue, SOC dashboard.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_unresolved_critical AS
SELECT
    i.incident_id,
    i.incident_ref,
    i.title,
    i.severity,
    i.status,
    i.risk_score,
    i.affected_users_count,
    i.created_at,
    EXTRACT(DAY FROM NOW() - i.created_at)::INTEGER   AS days_open,
    r.full_name                                        AS reporter_name,
    it.type_name                                       AS incident_type,
    a_user.full_name                                   AS assigned_analyst,
    -- Flag incidents that have been open more than 3 days
    (EXTRACT(DAY FROM NOW() - i.created_at) > 3)      AS is_overdue
FROM
    incidents    i
    LEFT JOIN users         r       ON r.user_id     = i.reporter_id
    LEFT JOIN incident_types it     ON it.type_id    = i.type_id
    LEFT JOIN assignments    a      ON a.incident_id = i.incident_id AND a.is_active = TRUE
    LEFT JOIN users          a_user ON a_user.user_id = a.analyst_id
WHERE
    i.severity IN ('critical', 'high')
    AND i.status NOT IN ('resolved', 'closed')
ORDER BY
    CASE i.severity WHEN 'critical' THEN 1 ELSE 2 END,
    i.risk_score DESC,
    i.created_at ASC;

COMMENT ON VIEW v_unresolved_critical IS
  'High and critical severity incidents still open. Flags overdue incidents (>3 days). Used for SOC priority alerts.';


-- ─────────────────────────────────────────────────────────────
-- VIEW 6: v_resolution_performance
-- Per-analyst resolution time performance metrics.
-- Used by: Analytics page, management reporting.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_resolution_performance AS
SELECT
    u.user_id                                     AS analyst_id,
    u.full_name                                   AS analyst_name,
    u.department,
    COUNT(res.resolution_id)                      AS total_resolved,
    ROUND(AVG(res.resolution_time_hours), 2)      AS avg_resolution_hours,
    ROUND(MIN(res.resolution_time_hours), 2)      AS min_resolution_hours,
    ROUND(MAX(res.resolution_time_hours), 2)      AS max_resolution_hours,
    -- Efficiency tier based on average hours
    CASE
        WHEN AVG(res.resolution_time_hours) < 24   THEN 'Excellent (<1 day)'
        WHEN AVG(res.resolution_time_hours) < 72   THEN 'Good (<3 days)'
        WHEN AVG(res.resolution_time_hours) < 168  THEN 'Average (<1 week)'
        ELSE                                             'Needs Improvement'
    END                                           AS efficiency_tier
FROM
    users       u
    JOIN roles  ro  ON ro.role_id = u.role_id AND ro.role_name = 'analyst'
    LEFT JOIN assignments  a    ON a.analyst_id   = u.user_id
    LEFT JOIN resolutions  res  ON res.incident_id = a.incident_id
                               AND res.resolved_by  = u.user_id
GROUP BY
    u.user_id, u.full_name, u.department
ORDER BY
    avg_resolution_hours ASC NULLS LAST;

COMMENT ON VIEW v_resolution_performance IS
  'Analyst resolution time performance with efficiency tier classification. Used for management reports.';
