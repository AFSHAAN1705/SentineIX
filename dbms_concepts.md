# SentinelX — DBMS Concepts Implementation

## 1. Primary Keys
- `users.user_id` — SERIAL PRIMARY KEY
- `incidents.incident_id` — SERIAL PRIMARY KEY
- `assignments.assignment_id` — SERIAL PRIMARY KEY
- `investigation_notes.note_id` — SERIAL PRIMARY KEY
- `evidence.evidence_id` — SERIAL PRIMARY KEY
- `status_logs.log_id` — SERIAL PRIMARY KEY
- `resolutions.resolution_id` — SERIAL PRIMARY KEY
- `notifications.notification_id` — SERIAL PRIMARY KEY
- `audit_logs.log_id` — SERIAL PRIMARY KEY
- `threat_feeds.threat_id` — SERIAL PRIMARY KEY
- `incident_types.type_id` — SERIAL PRIMARY KEY

## 2. Foreign Keys
- `incidents.type_id` → `incident_types.type_id`
- `incidents.reported_by` → `users.user_id`
- `assignments.incident_id` → `incidents.incident_id` (UNIQUE — one-to-one)
- `assignments.analyst_id` → `users.user_id`
- `assignments.assigned_by` → `users.user_id`
- `investigation_notes.incident_id` → `incidents.incident_id`
- `investigation_notes.analyst_id` → `users.user_id`
- `evidence.incident_id` → `incidents.incident_id`
- `evidence.uploaded_by` → `users.user_id`
- `status_logs.incident_id` → `incidents.incident_id`
- `status_logs.changed_by` → `users.user_id`
- `resolutions.incident_id` → `incidents.incident_id` (UNIQUE)
- `resolutions.analyst_id` → `users.user_id`
- `notifications.user_id` → `users.user_id`
- `audit_logs.user_id` → `users.user_id`

## 3. Candidate Keys
- `users.email` (UNIQUE NOT NULL)
- `incident_types.type_name` (UNIQUE NOT NULL)
- `assignments.incident_id` (UNIQUE)
- `resolutions.incident_id` (UNIQUE)

## 4. Unique Constraints
- `users.email` — declared via `unique=True`
- `incident_types.type_name` — declared via `unique=True`
- `assignments.incident_id` — one incident can have at most one assignment
- `resolutions.incident_id` — one incident can have at most one resolution (`uq_resolutions_incident_id`)

## 5. Check Constraints
- `evidence.file_size >= 0`
- `resolutions.time_to_resolve_hours >= 0`
- `incident_types.weight >= 1 AND weight <= 20`
- `incidents.title length >= 5` (application-level in model)
- `incidents.description length >= 10` (application-level in model)
- `users.theme_preference IN ('dark', 'light')`
- `users.email` format via regex constraint

## 6. Composite Indexes
- `ix_incidents_type_status` on `incidents(type_id, status)` — for filtering by type + status
- `ix_incidents_severity_status` on `incidents(severity, status)` — for filtering by severity + status
- `ix_notifications_user_read` on `notifications(user_id, is_read)` — for unread notification count
- `ix_incidents_status` on `incidents(status)` — for status-based queries
- `ix_incidents_severity` on `incidents(severity)` — for severity-based queries
- `ix_incidents_reported_by` on `incidents(reported_by)` — for reporter lookups
- `ix_assignments_analyst_id` on `assignments(analyst_id)` — for analyst workload queries
- `ix_audit_logs_action` on `audit_logs(action)` — for action-based filtering
- `ix_audit_logs_timestamp` on `audit_logs(timestamp)` — for chronological queries
- `ix_threat_feeds_severity` on `threat_feeds(severity)` — for severity filtering
- `ix_threat_feeds_created_at` on `threat_feeds(created_at)` — for chronological queries

## 7. Views
- `vw_open_incidents` — JOIN across 4 tables to show unresolved incidents with analyst info
- `vw_analyst_workload` — Aggregate with GROUP BY to count active incidents per analyst
- `vw_monthly_trends` — GROUP BY month/year with COUNT for trend analysis
- `vw_resolution_times` — JOIN incidents + resolutions + users for resolution metrics
- `vw_incident_risk_scores` — Calculated column with CASE expression for dynamic risk scoring
- `vw_audit_trail` — JOIN audit_logs + users for complete audit trail with user details

## 8. Triggers
- `trg_updated_at` — BEFORE UPDATE ON incidents — auto-updates `updated_at` timestamp
- `trg_status_log` — AFTER UPDATE OF status ON incidents — automatically logs status changes

## 9. Stored Procedures (Functions)
- `fn_assign_incident(p_incident_id, p_analyst_id, p_assigned_by_id)` — Assigns incident with upsert
- `fn_resolve_incident(p_incident_id, p_analyst_id, p_resolution_text)` — Resolves incident with time calculation
- `fn_get_analyst_stats(p_analyst_id)` — Returns JSON with assigned count, resolved count, avg hours

## 10. Transactions
- All route handlers use `db.session.commit()` which wraps operations in transactions
- `db.session.rollback()` in 500 error handler ensures failed operations don't leave partial state
- Flask-SQLAlchemy's session automatically handles transaction boundaries

## 11. Joins
- **INNER JOIN**: `Incident.query.join(Incident.assignment)` — incidents with assignments
- **LEFT JOIN**: In views like `vw_open_incidents` — LEFT JOIN assignments/users for optional analyst
- **Multiple JOINs**: In `vw_incident_risk_scores` — JOIN incidents with incident_types
- **Self JOIN**: Via relationships — User ↔ Assignment (analyst_id and assigned_by both reference users)

## 12. Aggregate Functions
- `COUNT(*)` — total counts (incidents, users, etc.)
- `AVG(time_to_resolve_hours)` — average resolution time per analyst
- `SUM()` — in risk score calculation and statistics
- `MIN()` / `MAX()` — available for timestamp ranges

## 13. GROUP BY / HAVING
- Monthly trends: `GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)`
- Analyst workload view: `GROUP BY u.user_id, u.full_name`
- Severity distribution: `GROUP BY severity` (via Python Counter in routes)

## 14. Window Functions
- Analyst leaderboard ranking (application-level sorting)
- Pagination queries use OFFSET/LIMIT for windowing behavior

## 15. Pagination Queries
- All list views use: `.offset((page - 1) * per_page).limit(per_page)` with `total_pages` calculation
- Admin incidents: 15 per page with sorting
- Analyst assignments: 15 per page with sorting
- Audit logs: 25 per page with action filtering

## 16. Query Optimization
- Composite indexes reduce filtering overhead on multi-condition queries
- Selective column loading in views avoids unnecessary data transfer
- Pagination prevents loading entire result sets
- Pre-computed counts for total vs. filtered results
- `func.coalesce()` handles NULL values in aggregate calculations
- Strategic use of `db.session.flush()` before commit for ID generation without full commit

## 17. Normalization (3NF)
- **1NF**: Atomic columns, no repeating groups
- **2NF**: All non-key attributes fully functionally dependent on primary keys
- **3NF**: No transitive dependencies — e.g., incident type details are in `incident_types`, analyst details in `users`
