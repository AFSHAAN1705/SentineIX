import React from 'react';
import { formatDateTime, capitalizeFirst } from '../../utils/formatters';

const STATUS_ICONS = {
  open: 'fiber_new',
  assigned: 'assignment_ind',
  investigating: 'manage_search',
  under_review: 'rate_review',
  resolved: 'check_circle',
  closed: 'lock',
};

const Timeline = ({ statusLogs = [] }) => {
  if (!statusLogs.length) {
    return (
      <div className="no-data">
        <span className="material-icons">timeline</span>
        <p>No status history</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {statusLogs.map((log, idx) => (
        <div key={log.log_id || idx} className={`timeline-item ${log.new_status}`}>
          <div className="timeline-time">{formatDateTime(log.changed_at || log.created_at)}</div>
          <div className="timeline-content">
            <div className="timeline-status">
              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>
                {STATUS_ICONS[log.new_status] || 'circle'}
              </span>
              {capitalizeFirst(log.new_status)}
              {log.old_status && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>
                  {' '}(from {capitalizeFirst(log.old_status)})
                </span>
              )}
            </div>
            <div className="timeline-user">
              By: <strong>{log.changedBy?.full_name || log.user?.full_name || 'System'}</strong>
            </div>
            {log.reason && <div className="timeline-reason">"{log.reason}"</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
