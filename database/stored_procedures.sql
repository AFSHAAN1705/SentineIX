-- ============================================================
-- SentinelX Database — STORED PROCEDURES / FUNCTIONS
-- PostgreSQL 15+
-- Run: psql -U sentinelx -d sentinelx_db -f stored_procedures.sql
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 1: fn_assign_incident
-- Assigns an incident to an analyst transactionally.
-- Steps:
--   1. Deactivate any existing active assignment
--   2. Insert new assignment record
--   3. Update incident status to 'assigned'
--   4. Create notification for analyst
--   5. Write to audit_logs
--
-- USAGE:
--   SELECT fn_assign_incident(
--       'incident-uuid', 'analyst-uuid', 'admin-uuid'
--   );
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_assign_incident(
    p_incident_id   UUID,
    p_analyst_id    UUID,
    p_assigned_by   UUID
)
RETURNS VOID AS $$
DECLARE
    v_incident_ref   VARCHAR(20);
    v_incident_title VARCHAR(255);
BEGIN
    -- Validate incident exists
    SELECT incident_ref, title
    INTO   v_incident_ref, v_incident_title
    FROM   incidents
    WHERE  incident_id = p_incident_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident % not found', p_incident_id;
    END IF;

    -- Deactivate any existing active assignment for this incident
    UPDATE assignments
    SET    is_active   = FALSE,
           updated_at  = NOW()
    WHERE  incident_id = p_incident_id
      AND  is_active   = TRUE;

    -- Create the new assignment
    INSERT INTO assignments (
        incident_id,
        analyst_id,
        assigned_by,
        assigned_at,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_incident_id,
        p_analyst_id,
        p_assigned_by,
        NOW(),
        TRUE,
        NOW(),
        NOW()
    );

    -- Update incident status to 'assigned'
    UPDATE incidents
    SET    status     = 'assigned',
           updated_at = NOW()
    WHERE  incident_id = p_incident_id
      AND  status NOT IN ('resolved', 'closed');

    -- Create in-app notification for the analyst
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        related_incident_id,
        is_read,
        created_at,
        updated_at
    ) VALUES (
        p_analyst_id,
        'incident_assigned',
        'New Incident Assigned',
        FORMAT('You have been assigned incident %s: "%s". Please begin investigation.',
               v_incident_ref, v_incident_title),
        p_incident_id,
        FALSE,
        NOW(),
        NOW()
    );

    -- Write audit log entry
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        ip_address,
        created_at,
        updated_at
    ) VALUES (
        p_assigned_by,
        'ASSIGN',
        'Incident',
        p_incident_id::TEXT,
        jsonb_build_object(
            'incident_ref', v_incident_ref,
            'analyst_id',   p_analyst_id,
            'assigned_by',  p_assigned_by,
            'action',       'Incident assigned to analyst'
        ),
        'stored_procedure',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Incident % assigned to analyst % by %',
        v_incident_ref, p_analyst_id, p_assigned_by;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_assign_incident(UUID, UUID, UUID) IS
  'Transactionally assigns an incident to an analyst: deactivates old assignment, creates new one, updates status, notifies analyst, logs to audit.';


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 2: fn_resolve_incident
-- Closes an incident with a full resolution record.
-- Steps:
--   1. Validate incident is not already resolved
--   2. Calculate resolution time in hours
--   3. Insert resolution record
--   4. Update incident status to 'resolved' and set resolved_at
--   5. Write to audit_logs
--
-- USAGE:
--   SELECT fn_resolve_incident(
--       'incident-uuid', 'analyst-uuid',
--       'Phishing email',
--       'Quarantined system, reset credentials',
--       'Deploy email filtering'
--   );
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_resolve_incident(
    p_incident_id          UUID,
    p_resolved_by          UUID,
    p_root_cause           TEXT,
    p_actions_taken        TEXT,
    p_prevention_measures  TEXT
)
RETURNS VOID AS $$
DECLARE
    v_incident_ref     VARCHAR(20);
    v_created_at       TIMESTAMP;
    v_resolution_hours NUMERIC;
BEGIN
    -- Validate incident is resolvable
    SELECT incident_ref, created_at
    INTO   v_incident_ref, v_created_at
    FROM   incidents
    WHERE  incident_id = p_incident_id
      AND  status NOT IN ('resolved', 'closed');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incident % not found or already resolved/closed', p_incident_id;
    END IF;

    -- Calculate how many hours from creation to now
    v_resolution_hours := ROUND(
        EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 3600.0,
        2
    );

    -- Insert resolution record
    INSERT INTO resolutions (
        incident_id,
        resolved_by,
        root_cause,
        actions_taken,
        prevention_measures,
        resolution_time_hours,
        created_at,
        updated_at
    ) VALUES (
        p_incident_id,
        p_resolved_by,
        p_root_cause,
        p_actions_taken,
        p_prevention_measures,
        v_resolution_hours,
        NOW(),
        NOW()
    );

    -- Update incident: mark as resolved with timestamp
    UPDATE incidents
    SET    status      = 'resolved',
           resolved_at = NOW(),
           updated_at  = NOW()
    WHERE  incident_id = p_incident_id;

    -- Audit log entry
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        ip_address,
        created_at,
        updated_at
    ) VALUES (
        p_resolved_by,
        'UPDATE',
        'Incident',
        p_incident_id::TEXT,
        jsonb_build_object(
            'incident_ref',        v_incident_ref,
            'status',              'resolved',
            'resolution_hours',    v_resolution_hours,
            'root_cause',          p_root_cause
        ),
        'stored_procedure',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Incident % resolved in %.2f hours', v_incident_ref, v_resolution_hours;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_resolve_incident(UUID, UUID, TEXT, TEXT, TEXT) IS
  'Atomically resolves an incident: creates resolution record, updates status to resolved, sets resolved_at timestamp, and logs to audit.';


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 3: fn_get_dashboard_stats
-- Returns dashboard KPI statistics tailored by role.
-- Admins get full platform stats; analysts get their workload.
--
-- USAGE:
--   SELECT * FROM fn_get_dashboard_stats('admin', 'admin-uuid');
--   SELECT * FROM fn_get_dashboard_stats('analyst', 'analyst-uuid');
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_dashboard_stats(
    p_role    TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    metric         TEXT,
    value          BIGINT,
    description    TEXT
) AS $$
BEGIN
    IF p_role = 'admin' THEN
        RETURN QUERY
        SELECT 'total_incidents'::TEXT,
               COUNT(*)::BIGINT,
               'All incidents in the platform'::TEXT
        FROM   incidents

        UNION ALL

        SELECT 'open_incidents',
               COUNT(*)::BIGINT,
               'Incidents not yet resolved or closed'
        FROM   incidents
        WHERE  status NOT IN ('resolved', 'closed')

        UNION ALL

        SELECT 'critical_incidents',
               COUNT(*)::BIGINT,
               'Critical severity incidents currently open'
        FROM   incidents
        WHERE  severity = 'critical'
          AND  status NOT IN ('resolved', 'closed')

        UNION ALL

        SELECT 'resolved_incidents',
               COUNT(*)::BIGINT,
               'Resolved and closed incidents'
        FROM   incidents
        WHERE  status IN ('resolved', 'closed')

        UNION ALL

        SELECT 'total_users',
               COUNT(*)::BIGINT,
               'Active registered users'
        FROM   users
        WHERE  is_active = TRUE

        UNION ALL

        SELECT 'total_analysts',
               COUNT(*)::BIGINT,
               'Active analyst accounts'
        FROM   users  u
        JOIN   roles  r ON r.role_id = u.role_id AND r.role_name = 'analyst'
        WHERE  u.is_active = TRUE

        UNION ALL

        SELECT 'active_threats',
               COUNT(*)::BIGINT,
               'Active threat intelligence feeds'
        FROM   threat_feeds
        WHERE  is_active = TRUE;

    ELSIF p_role = 'analyst' THEN
        RETURN QUERY
        SELECT 'my_assigned'::TEXT,
               COUNT(*)::BIGINT,
               'Incidents assigned to me'
        FROM   assignments a
        WHERE  a.analyst_id = p_user_id AND a.is_active = TRUE

        UNION ALL

        SELECT 'my_open',
               COUNT(*)::BIGINT,
               'My assigned incidents still open'
        FROM   assignments a
        JOIN   incidents   i ON i.incident_id = a.incident_id
        WHERE  a.analyst_id = p_user_id
          AND  a.is_active  = TRUE
          AND  i.status NOT IN ('resolved', 'closed')

        UNION ALL

        SELECT 'my_resolved',
               COUNT(*)::BIGINT,
               'Incidents I have resolved'
        FROM   resolutions r
        WHERE  r.resolved_by = p_user_id

        UNION ALL

        SELECT 'critical_assigned',
               COUNT(*)::BIGINT,
               'Critical incidents assigned to me'
        FROM   assignments a
        JOIN   incidents   i ON i.incident_id = a.incident_id
        WHERE  a.analyst_id = p_user_id
          AND  a.is_active  = TRUE
          AND  i.severity   = 'critical'
          AND  i.status NOT IN ('resolved', 'closed');

    ELSE
        -- Reporter
        RETURN QUERY
        SELECT 'my_submitted'::TEXT,
               COUNT(*)::BIGINT,
               'Incidents I have reported'
        FROM   incidents
        WHERE  reporter_id = p_user_id

        UNION ALL

        SELECT 'my_open',
               COUNT(*)::BIGINT,
               'My reported incidents still open'
        FROM   incidents
        WHERE  reporter_id = p_user_id
          AND  status NOT IN ('resolved', 'closed')

        UNION ALL

        SELECT 'my_resolved',
               COUNT(*)::BIGINT,
               'My reported incidents resolved'
        FROM   incidents
        WHERE  reporter_id = p_user_id
          AND  status IN ('resolved', 'closed');
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_get_dashboard_stats(TEXT, UUID) IS
  'Role-aware dashboard KPI function. Returns different metric sets for admin, analyst, and reporter roles.';


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 4: fn_calculate_risk_score
-- Pure function to compute a risk score (0–100) from inputs.
-- Used by the application risk scoring service and triggers.
--
-- USAGE:
--   SELECT fn_calculate_risk_score('critical', 9, 14);
--   -- Returns: 100 (85 base + 10 weight bonus + 5 age capped at 100)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_calculate_risk_score(
    p_severity              TEXT,
    p_type_severity_weight  INTEGER DEFAULT 1,
    p_age_days              INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    v_base_score    INTEGER;
    v_weight_bonus  INTEGER;
    v_age_bonus     INTEGER;
    v_final_score   INTEGER;
BEGIN
    -- Base score by severity
    v_base_score := CASE LOWER(p_severity)
        WHEN 'low'      THEN 10
        WHEN 'medium'   THEN 30
        WHEN 'high'     THEN 60
        WHEN 'critical' THEN 85
        ELSE                  10
    END;

    -- Type weight bonus: severity_weight (1-10) * 2, capped at 10
    v_weight_bonus := LEAST(COALESCE(p_type_severity_weight, 1) * 2, 10);

    -- Age factor: every 7 days unresolved adds 1 point, max +10
    v_age_bonus := LEAST(COALESCE(p_age_days, 0) / 7, 10);

    -- Total, capped at 100
    v_final_score := LEAST(v_base_score + v_weight_bonus + v_age_bonus, 100);

    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION fn_calculate_risk_score(TEXT, INTEGER, INTEGER) IS
  'Pure risk score calculator. Inputs: severity, type weight (1-10), age in days. Returns 0-100. IMMUTABLE for caching.';


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 5: fn_generate_monthly_report
-- Returns all incidents created in a given year and month.
-- Used for scheduled report generation.
--
-- USAGE:
--   SELECT * FROM fn_generate_monthly_report(2024, 6);
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_monthly_report(
    p_year  INTEGER,
    p_month INTEGER
)
RETURNS TABLE (
    incident_ref          VARCHAR,
    title                 VARCHAR,
    severity              VARCHAR,
    status                VARCHAR,
    risk_score            INTEGER,
    incident_type         VARCHAR,
    reporter_name         VARCHAR,
    reporter_department   VARCHAR,
    analyst_name          VARCHAR,
    created_at            TIMESTAMP,
    resolved_at           TIMESTAMP,
    resolution_time_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.incident_ref,
        i.title,
        i.severity::VARCHAR,
        i.status::VARCHAR,
        i.risk_score,
        it.type_name::VARCHAR       AS incident_type,
        r.full_name::VARCHAR        AS reporter_name,
        r.department::VARCHAR       AS reporter_department,
        a_user.full_name::VARCHAR   AS analyst_name,
        i.created_at,
        i.resolved_at,
        res.resolution_time_hours
    FROM
        incidents    i
        LEFT JOIN incident_types it     ON it.type_id    = i.type_id
        LEFT JOIN users          r      ON r.user_id     = i.reporter_id
        LEFT JOIN assignments    a      ON a.incident_id = i.incident_id AND a.is_active = TRUE
        LEFT JOIN users          a_user ON a_user.user_id = a.analyst_id
        LEFT JOIN resolutions    res    ON res.incident_id = i.incident_id
    WHERE
        EXTRACT(YEAR  FROM i.created_at) = p_year
        AND EXTRACT(MONTH FROM i.created_at) = p_month
    ORDER BY
        i.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_generate_monthly_report(INTEGER, INTEGER) IS
  'Returns all incidents for a given year/month with full join data. Used for monthly security reports.';


-- ─────────────────────────────────────────────────────────────
-- FUNCTION 6: fn_cleanup_old_notifications
-- Maintenance function to delete old read notifications.
-- Returns the number of deleted rows.
-- Should be run periodically (e.g. nightly cron).
--
-- USAGE:
--   SELECT fn_cleanup_old_notifications(30);  -- delete read notifs older than 30 days
--   SELECT fn_cleanup_old_notifications();     -- uses default of 30 days
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_cleanup_old_notifications(
    p_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE  is_read  = TRUE
      AND  created_at < NOW() - (p_days || ' days')::INTERVAL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % old notifications (older than % days)', v_deleted_count, p_days;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_cleanup_old_notifications(INTEGER) IS
  'Deletes read notifications older than p_days days (default 30). Returns count of deleted rows. Run as scheduled maintenance.';
