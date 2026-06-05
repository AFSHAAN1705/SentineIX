import React from 'react';

const SEVERITY = { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-critical' };
const STATUS = { open: 'badge-warning', assigned: 'badge-info', investigating: 'badge-purple', under_review: 'badge-orange', resolved: 'badge-success', closed: 'badge-gray' };

const Badge = ({ type, value, className = '' }) => {
  let cls = 'badge-gray';
  if (type === 'severity') cls = SEVERITY[value] || 'badge-gray';
  else if (type === 'status') cls = STATUS[value] || 'badge-gray';
  else cls = className || 'badge-gray';

  return (
    <span className={`badge-custom ${cls}`}>
      {value?.replace(/_/g, ' ')}
    </span>
  );
};

export default Badge;
