import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  return (
    <div className="pagination-custom">
      <button className="page-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <span className="material-icons" style={{ fontSize: '1rem' }}>chevron_left</span>
      </button>
      {getPages().map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          : <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      )}
      <button className="page-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        <span className="material-icons" style={{ fontSize: '1rem' }}>chevron_right</span>
      </button>
    </div>
  );
};

export default Pagination;
