-- ============================================================
-- SentinelX Database — MASTER RUNNER
-- Applies all advanced DBMS objects in the correct order.
--
-- USAGE:
--   psql -U sentinelx -d sentinelx_db -f run_all.sql
--
-- PREREQUISITES:
--   - PostgreSQL 15+ running
--   - sentinelx_db database created
--   - Base tables created via: npm run dev (in backend/)
--     which runs sequelize.sync({ alter: true }) and seeds data
-- ============================================================

\echo ''
\echo '======================================================'
\echo ' SentinelX — Applying Advanced DBMS Objects'
\echo '======================================================'

\echo ''
\echo '[1/3] Creating Views...'
\i views.sql

\echo ''
\echo '[2/3] Creating Triggers...'
\i triggers.sql

\echo ''
\echo '[3/3] Creating Stored Procedures & Functions...'
\i stored_procedures.sql

\echo ''
\echo '======================================================'
\echo ' All DBMS objects created successfully!'
\echo ''
\echo ' VIEWS created:'
\echo '   v_incident_summary       - Full incident details'
\echo '   v_active_threats         - Active threat feeds'
\echo '   v_analyst_workload       - Per-analyst workload stats'
\echo '   v_daily_incident_stats   - Daily counts by severity'
\echo '   v_unresolved_critical    - High/critical open incidents'
\echo '   v_resolution_performance - Analyst resolution metrics'
\echo ''
\echo ' TRIGGERS created:'
\echo '   trg_auto_incident_ref           - Auto SX-YYYY-NNNNN ref'
\echo '   trg_incident_status_log         - Status change logging'
\echo '   trg_audit_incidents             - Full JSONB audit trail'
\echo '   trg_update_risk_on_severity_change - Risk recalculation'
\echo '   trg_notify_on_assignment        - Analyst notifications'
\echo ''
\echo ' FUNCTIONS created:'
\echo '   fn_assign_incident()            - Transactional assignment'
\echo '   fn_resolve_incident()           - Atomic resolution'
\echo '   fn_get_dashboard_stats()        - Role-aware KPIs'
\echo '   fn_calculate_risk_score()       - Pure risk formula'
\echo '   fn_generate_monthly_report()    - Parameterized report'
\echo '   fn_cleanup_old_notifications()  - Maintenance cleanup'
\echo '======================================================'
\echo ''

-- Verify views exist
SELECT viewname, definition
FROM   pg_views
WHERE  schemaname = 'public'
  AND  viewname   LIKE 'v_%'
ORDER BY viewname;
