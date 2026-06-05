-- ============================================================
-- SentinelX Database — TRIGGERS
-- PostgreSQL 15+
-- Run: psql -U sentinelx -d sentinelx_db -f triggers.sql
-- ============================================================

-- Ensure the incident_ref sequence exists
CREATE SEQUENCE IF NOT EXISTS incident_ref_seq
    START WITH 1
    INCREMENT BY 1
    NO MAXVALUE
    NO CYCLE;


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 1: trg_auto_incident_ref
-- Automatically generates a unique incident reference number
-- in the format SX-YYYY-NNNNN (e.g. SX-2024-00042)
-- BEFORE INSERT on incidents — sets incident_ref if not provided.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trg_auto_incident_ref()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not already set
    IF NEW.incident_ref IS NULL OR NEW.incident_ref = '' THEN
        NEW.incident_ref := 'SX-'
            || TO_CHAR(NOW(), 'YYYY')
            || '-'
            || LPAD(nextval('incident_ref_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trg_auto_incident_ref ON incidents;

CREATE TRIGGER trg_auto_incident_ref
    BEFORE INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_auto_incident_ref();

COMMENT ON FUNCTION fn_trg_auto_incident_ref() IS
  'Auto-generates SX-YYYY-NNNNN incident reference using incident_ref_seq. Fires BEFORE INSERT on incidents.';


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 2: trg_incident_status_log
-- Writes an entry to status_logs whenever an incident's
-- status column is updated. Captures old and new status,
-- the timestamp, and preserves audit trail integrity.
-- AFTER UPDATE on incidents.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trg_incident_status_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire if the status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_logs (
            incident_id,
            changed_by,
            old_status,
            new_status,
            reason,
            changed_at,
            created_at,
            updated_at
        ) VALUES (
            NEW.incident_id,
            NEW.reporter_id,        -- placeholder; app layer passes actual changer via service
            OLD.status,
            NEW.status,
            'Status updated via application',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incident_status_log ON incidents;

CREATE TRIGGER trg_incident_status_log
    AFTER UPDATE OF status ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_incident_status_log();

COMMENT ON FUNCTION fn_trg_incident_status_log() IS
  'Automatically logs every incident status change to status_logs for full audit trail.';


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 3: trg_audit_incidents
-- Full audit trail trigger on the incidents table.
-- Logs INSERT, UPDATE, and DELETE operations to audit_logs
-- with a JSONB diff of what changed.
-- AFTER INSERT OR UPDATE OR DELETE on incidents.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trg_audit_incidents()
RETURNS TRIGGER AS $$
DECLARE
    v_action      VARCHAR(20);
    v_entity_id   VARCHAR(36);
    v_changes     JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action    := 'CREATE';
        v_entity_id := NEW.incident_id::TEXT;
        v_changes   := to_jsonb(NEW);

    ELSIF TG_OP = 'UPDATE' THEN
        v_action    := 'UPDATE';
        v_entity_id := NEW.incident_id::TEXT;
        -- Store only the diff: fields that actually changed
        v_changes   := jsonb_build_object(
            'before', to_jsonb(OLD),
            'after',  to_jsonb(NEW)
        );

    ELSIF TG_OP = 'DELETE' THEN
        v_action    := 'DELETE';
        v_entity_id := OLD.incident_id::TEXT;
        v_changes   := to_jsonb(OLD);
    END IF;

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
        NULL,               -- User ID resolved at application layer via JWT
        v_action,
        'Incident',
        v_entity_id,
        v_changes,
        'trigger',          -- Marks this as trigger-generated entry
        NOW(),
        NOW()
    );

    -- Return appropriate row for each operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_incidents ON incidents;

CREATE TRIGGER trg_audit_incidents
    AFTER INSERT OR UPDATE OR DELETE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_audit_incidents();

COMMENT ON FUNCTION fn_trg_audit_incidents() IS
  'Audit trigger: logs all INSERT/UPDATE/DELETE on incidents to audit_logs with JSONB diffs.';


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 4: trg_update_risk_on_severity_change
-- Recalculates an incident's risk_score and risk_level
-- automatically whenever the severity column is updated.
-- This keeps risk data consistent without application-layer calls.
-- AFTER UPDATE OF severity on incidents.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trg_update_risk_on_severity_change()
RETURNS TRIGGER AS $$
DECLARE
    v_base_score    INTEGER;
    v_weight_bonus  INTEGER;
    v_age_bonus     INTEGER;
    v_final_score   INTEGER;
    v_risk_level    VARCHAR(20);
    v_type_weight   INTEGER;
    v_age_days      INTEGER;
BEGIN
    -- Only recalculate if severity actually changed
    IF OLD.severity IS NOT DISTINCT FROM NEW.severity THEN
        RETURN NEW;
    END IF;

    -- Base score by severity
    v_base_score := CASE NEW.severity
        WHEN 'low'      THEN 10
        WHEN 'medium'   THEN 30
        WHEN 'high'     THEN 60
        WHEN 'critical' THEN 85
        ELSE 10
    END;

    -- Get type severity weight (default 1 if not found)
    SELECT COALESCE(it.severity_weight, 1)
    INTO   v_type_weight
    FROM   incident_types it
    WHERE  it.type_id = NEW.type_id;

    v_weight_bonus := LEAST((v_type_weight * 2), 10);

    -- Age bonus: incidents unresolved for longer score higher (max +10)
    v_age_days   := GREATEST(EXTRACT(DAY FROM NOW() - NEW.created_at)::INTEGER, 0);
    v_age_bonus  := LEAST((v_age_days / 7), 10);

    -- Compute final score (capped at 100)
    v_final_score := LEAST(v_base_score + v_weight_bonus + v_age_bonus, 100);

    -- Determine risk level label
    v_risk_level := CASE
        WHEN v_final_score >= 75 THEN 'critical'
        WHEN v_final_score >= 50 THEN 'high'
        WHEN v_final_score >= 25 THEN 'medium'
        ELSE                          'low'
    END;

    -- Update the incident directly
    UPDATE incidents
    SET    risk_score = v_final_score,
           risk_level = v_risk_level
    WHERE  incident_id = NEW.incident_id;

    -- Return NEW with updated values for the trigger chain
    NEW.risk_score := v_final_score;
    NEW.risk_level := v_risk_level;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_risk_on_severity_change ON incidents;

CREATE TRIGGER trg_update_risk_on_severity_change
    AFTER UPDATE OF severity ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_update_risk_on_severity_change();

COMMENT ON FUNCTION fn_trg_update_risk_on_severity_change() IS
  'Recalculates risk_score and risk_level when incident severity changes. Formula: base + type_weight_bonus + age_bonus, capped at 100.';


-- ─────────────────────────────────────────────────────────────
-- TRIGGER 5: trg_notify_on_assignment
-- Creates an in-app notification for the analyst whenever
-- a new incident is assigned to them.
-- AFTER INSERT on assignments.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_trg_notify_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_incident_ref  VARCHAR(20);
    v_incident_title VARCHAR(255);
BEGIN
    -- Fetch the incident reference and title for the notification message
    SELECT incident_ref, title
    INTO   v_incident_ref, v_incident_title
    FROM   incidents
    WHERE  incident_id = NEW.incident_id;

    -- Insert notification for the assigned analyst
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
        NEW.analyst_id,
        'incident_assigned',
        'New Incident Assigned',
        FORMAT(
            'You have been assigned incident %s: "%s". Please begin investigation.',
            v_incident_ref,
            v_incident_title
        ),
        NEW.incident_id,
        FALSE,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_on_assignment ON assignments;

CREATE TRIGGER trg_notify_on_assignment
    AFTER INSERT ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_notify_on_assignment();

COMMENT ON FUNCTION fn_trg_notify_on_assignment() IS
  'Automatically creates an in-app notification for the analyst when a new assignment is created.';
