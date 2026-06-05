-- ============================================================
-- SentinelX Database — WINDOW FUNCTIONS (Analytical Queries)
-- PostgreSQL 15+
-- Run: psql -U sentinelx -d sentinelx_db -f window_functions.sql
--
-- These queries demonstrate advanced analytical SQL techniques
-- for the SentinelX cybersecurity platform reporting layer.
-- ============================================================


\echo '============================================================'
\echo ' SENTINELX — WINDOW FUNCTION ANALYTICAL QUERIES'
\echo '============================================================'


-- ─────────────────────────────────────────────────────────────
-- QUERY 1: Incident Risk Ranking by Severity Group
-- Business Purpose: Within each severity group, rank incidents
-- by risk score so analysts know which to prioritize first.
--
-- Window Function: RANK() OVER (PARTITION BY ... ORDER BY ...)
-- PARTITION BY severity → separate ranking per severity level
-- ORDER BY risk_score DESC → highest risk gets rank 1
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 1: Incident Risk Ranking by Severity Group ---'

SELECT
    incident_ref,
    title,
    severity,
    status,
    risk_score,
    RANK() OVER (
        PARTITION BY severity
        ORDER BY risk_score DESC, created_at ASC
    )                                       AS risk_rank_in_severity,
    RANK() OVER (
        ORDER BY risk_score DESC
    )                                       AS overall_risk_rank
FROM
    incidents
WHERE
    status NOT IN ('resolved', 'closed')
ORDER BY
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high'     THEN 2
        WHEN 'medium'   THEN 3
        WHEN 'low'      THEN 4
    END,
    risk_rank_in_severity;


-- ─────────────────────────────────────────────────────────────
-- QUERY 2: Running Total of Daily Incidents
-- Business Purpose: Cumulative incident count over time.
-- Useful for "incidents reported this month so far" KPI.
--
-- Window Function: SUM() OVER (ORDER BY day ROWS UNBOUNDED PRECEDING)
-- ROWS UNBOUNDED PRECEDING → include all previous rows (running total)
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 2: Running Total of Daily Incidents ---'

WITH daily_counts AS (
    SELECT
        DATE(created_at)  AS incident_day,
        COUNT(*)          AS daily_count
    FROM
        incidents
    WHERE
        created_at >= NOW() - INTERVAL '90 days'
    GROUP BY
        DATE(created_at)
)
SELECT
    incident_day,
    daily_count,
    SUM(daily_count) OVER (
        ORDER BY incident_day
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                       AS running_total,
    ROUND(
        AVG(daily_count) OVER (
            ORDER BY incident_day
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ), 2
    )                       AS running_average
FROM
    daily_counts
ORDER BY
    incident_day;


-- ─────────────────────────────────────────────────────────────
-- QUERY 3: Month-over-Month Incident Change
-- Business Purpose: Detect whether the security posture is
-- improving (fewer incidents) or worsening (more incidents).
--
-- Window Function: LAG(count, 1) OVER (ORDER BY month)
-- LAG → accesses the previous row's value without a self-JOIN
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 3: Month-over-Month Incident Change ---'

WITH monthly_counts AS (
    SELECT
        DATE_TRUNC('month', created_at)  AS incident_month,
        COUNT(*)                         AS total_count,
        COUNT(*) FILTER (WHERE severity IN ('high','critical')) AS high_critical_count
    FROM
        incidents
    WHERE
        created_at >= NOW() - INTERVAL '12 months'
    GROUP BY
        DATE_TRUNC('month', created_at)
)
SELECT
    TO_CHAR(incident_month, 'Mon YYYY')                     AS month_label,
    total_count,
    LAG(total_count, 1) OVER (ORDER BY incident_month)      AS prev_month_count,
    total_count - LAG(total_count, 1) OVER (
        ORDER BY incident_month
    )                                                        AS month_delta,
    ROUND(
        (total_count - LAG(total_count, 1) OVER (ORDER BY incident_month))::NUMERIC
        / NULLIF(LAG(total_count, 1) OVER (ORDER BY incident_month), 0) * 100,
        1
    )                                                        AS pct_change,
    high_critical_count,
    CASE
        WHEN total_count > LAG(total_count, 1) OVER (ORDER BY incident_month)
        THEN '⬆ Increasing'
        WHEN total_count < LAG(total_count, 1) OVER (ORDER BY incident_month)
        THEN '⬇ Decreasing'
        ELSE '= Stable'
    END                                                      AS trend
FROM
    monthly_counts
ORDER BY
    incident_month;


-- ─────────────────────────────────────────────────────────────
-- QUERY 4: Analyst Performance Percentile
-- Business Purpose: Compare each analyst's resolution count
-- against peers to identify top performers and those needing support.
--
-- Window Function: PERCENT_RANK() OVER (ORDER BY resolved_count DESC)
-- PERCENT_RANK → 0.0 to 1.0 percentile rank (1.0 = best)
-- DENSE_RANK   → no gaps in ranking sequence
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 4: Analyst Performance Percentile ---'

WITH analyst_stats AS (
    SELECT
        u.user_id,
        u.full_name                                       AS analyst_name,
        u.department,
        COUNT(r.resolution_id)                            AS resolved_count,
        ROUND(AVG(r.resolution_time_hours), 1)            AS avg_resolution_hours,
        COUNT(a.assignment_id) FILTER (
            WHERE i.status NOT IN ('resolved','closed')
        )                                                 AS open_count
    FROM
        users        u
        JOIN roles   ro  ON ro.role_id   = u.role_id AND ro.role_name = 'analyst'
        LEFT JOIN assignments a   ON a.analyst_id   = u.user_id AND a.is_active = TRUE
        LEFT JOIN incidents   i   ON i.incident_id  = a.incident_id
        LEFT JOIN resolutions r   ON r.resolved_by  = u.user_id
    GROUP BY
        u.user_id, u.full_name, u.department
)
SELECT
    analyst_name,
    department,
    resolved_count,
    avg_resolution_hours,
    open_count,
    DENSE_RANK() OVER (
        ORDER BY resolved_count DESC, avg_resolution_hours ASC NULLS LAST
    )                                                     AS performance_rank,
    ROUND(
        PERCENT_RANK() OVER (
            ORDER BY resolved_count ASC
        ) * 100, 1
    )                                                     AS percentile,
    CASE
        WHEN PERCENT_RANK() OVER (ORDER BY resolved_count ASC) >= 0.8
        THEN 'Top Performer'
        WHEN PERCENT_RANK() OVER (ORDER BY resolved_count ASC) >= 0.5
        THEN 'Solid Performer'
        ELSE 'Needs Support'
    END                                                   AS performance_tier
FROM
    analyst_stats
ORDER BY
    performance_rank;


-- ─────────────────────────────────────────────────────────────
-- QUERY 5: 7-Day Moving Average of Daily Incidents
-- Business Purpose: Smooth out day-to-day noise to reveal
-- actual trends in incident volume (e.g. post-campaign spike).
--
-- Window Function: AVG() OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
-- ROWS BETWEEN 6 PRECEDING AND CURRENT ROW → sliding 7-day window
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 5: 7-Day Moving Average of Incidents ---'

WITH daily AS (
    SELECT
        DATE(created_at)   AS day,
        COUNT(*)           AS daily_count
    FROM
        incidents
    WHERE
        created_at >= NOW() - INTERVAL '60 days'
    GROUP BY
        DATE(created_at)
)
SELECT
    day,
    daily_count,
    ROUND(
        AVG(daily_count) OVER (
            ORDER BY day
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ), 2
    )                      AS moving_avg_7d,
    MAX(daily_count) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )                      AS peak_7d,
    MIN(daily_count) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )                      AS trough_7d
FROM
    daily
ORDER BY
    day;


-- ─────────────────────────────────────────────────────────────
-- QUERY 6: Top 3 Most Active Reporters per Department
-- Business Purpose: Identify the most engaged users in each
-- department — useful for recognition and security training.
--
-- Window Function: ROW_NUMBER() OVER (PARTITION BY department ORDER BY count DESC)
-- PARTITION BY department → restart row number per department
-- WHERE rn <= 3           → keep only top 3 per department
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 6: Top 3 Most Active Reporters per Department ---'

WITH reporter_counts AS (
    SELECT
        u.full_name,
        u.email,
        COALESCE(u.department, 'No Department') AS department,
        COUNT(i.incident_id)                     AS incident_count
    FROM
        users     u
        LEFT JOIN incidents i ON i.reporter_id = u.user_id
    WHERE
        u.is_active = TRUE
    GROUP BY
        u.user_id, u.full_name, u.email, u.department
),
ranked AS (
    SELECT
        full_name,
        email,
        department,
        incident_count,
        ROW_NUMBER() OVER (
            PARTITION BY department
            ORDER BY incident_count DESC, full_name ASC
        ) AS dept_rank
    FROM
        reporter_counts
)
SELECT
    department,
    dept_rank,
    full_name,
    email,
    incident_count
FROM
    ranked
WHERE
    dept_rank <= 3
ORDER BY
    department, dept_rank;


-- ─────────────────────────────────────────────────────────────
-- QUERY 7: Cumulative Monthly Resolution Rate
-- Business Purpose: Track whether the platform is keeping up
-- with the backlog — cumulative resolved / cumulative total.
--
-- Window Function: SUM() OVER (ORDER BY month) applied to both
-- resolved and total to compute running resolution rate.
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 7: Cumulative Monthly Resolution Rate ---'

WITH monthly AS (
    SELECT
        DATE_TRUNC('month', created_at)              AS month,
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (
            WHERE status IN ('resolved', 'closed')
        )                                             AS resolved
    FROM
        incidents
    WHERE
        created_at >= NOW() - INTERVAL '12 months'
    GROUP BY
        DATE_TRUNC('month', created_at)
)
SELECT
    TO_CHAR(month, 'Mon YYYY')                         AS month_label,
    total                                              AS monthly_total,
    resolved                                           AS monthly_resolved,
    SUM(total)    OVER (ORDER BY month)                AS cumulative_total,
    SUM(resolved) OVER (ORDER BY month)                AS cumulative_resolved,
    ROUND(
        SUM(resolved) OVER (ORDER BY month)::NUMERIC
        / NULLIF(SUM(total) OVER (ORDER BY month), 0) * 100,
        1
    )                                                  AS cumulative_resolution_rate_pct,
    ROUND(resolved::NUMERIC / NULLIF(total, 0) * 100, 1) AS monthly_resolution_rate_pct
FROM
    monthly
ORDER BY
    month;


-- ─────────────────────────────────────────────────────────────
-- QUERY 8: Incident Status Transition Analysis
-- Business Purpose: Understand how long incidents spend in each
-- status and identify bottlenecks in the investigation pipeline.
--
-- Window Function: LEAD(new_status, 1) OVER (PARTITION BY incident_id ORDER BY changed_at)
-- LEAD → looks at the NEXT row in the window (next status after current)
-- Computes time gap between consecutive status changes.
-- ─────────────────────────────────────────────────────────────
\echo ''
\echo '--- Query 8: Incident Status Transition Analysis ---'

WITH transitions AS (
    SELECT
        sl.incident_id,
        i.incident_ref,
        i.severity,
        sl.old_status,
        sl.new_status,
        sl.changed_at,
        LEAD(sl.new_status, 1) OVER (
            PARTITION BY sl.incident_id
            ORDER BY sl.changed_at
        )                                    AS next_status,
        LEAD(sl.changed_at, 1) OVER (
            PARTITION BY sl.incident_id
            ORDER BY sl.changed_at
        )                                    AS next_changed_at
    FROM
        status_logs sl
        JOIN incidents i ON i.incident_id = sl.incident_id
)
SELECT
    incident_ref,
    severity,
    old_status                                                AS from_status,
    new_status                                                AS to_status,
    changed_at                                                AS entered_at,
    next_changed_at                                           AS exited_at,
    -- Duration in hours for this status
    ROUND(
        EXTRACT(EPOCH FROM (
            COALESCE(next_changed_at, NOW()) - changed_at
        )) / 3600.0,
        2
    )                                                         AS hours_in_status,
    -- Average time ALL incidents spend in this status (window aggregate)
    ROUND(
        AVG(
            EXTRACT(EPOCH FROM (
                COALESCE(next_changed_at, NOW()) - changed_at
            )) / 3600.0
        ) OVER (PARTITION BY new_status),
        2
    )                                                         AS avg_hours_for_this_status
FROM
    transitions
ORDER BY
    incident_ref,
    entered_at;

\echo ''
\echo '============================================================'
\echo ' All window function queries completed.'
\echo '============================================================'
