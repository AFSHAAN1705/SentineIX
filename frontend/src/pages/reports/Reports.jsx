import React, { useState } from 'react';
import { reportService } from '../../services/reportService';
import { toast } from 'react-toastify';

const REPORTS = [
  { id: 'incidents', title: 'Incident Summary', desc: 'All incidents with status, severity, and timeline', icon: 'security', gradient: 'linear-gradient(135deg,#00f5ff,#7c3aed)' },
  { id: 'monthly', title: 'Monthly Security Report', desc: 'Monthly trends, statistics, and resolution metrics', icon: 'calendar_month', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  { id: 'analyst', title: 'Analyst Performance', desc: 'Workload, resolution times, and efficiency metrics', icon: 'psychology', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  { id: 'threat', title: 'Threat Intelligence', desc: 'Active threat feeds, CVE tracking, and threat landscape', icon: 'radar', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  { id: 'severity', title: 'Severity Distribution', desc: 'Breakdown of incidents by severity and type', icon: 'pie_chart', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { id: 'resolution', title: 'Resolution Time', desc: 'Avg, min, and max resolution times by analyst', icon: 'timer', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { id: 'combined', title: 'Combined AI Analysis Report', desc: 'Comprehensive report combining all metrics and AI analysis', icon: 'batch_prediction', gradient: 'linear-gradient(135deg,#ec4899,#be185d)' }
];

const FORMATS = [
  { fmt: 'csv', icon: 'table_chart', label: 'CSV' },
  { fmt: 'pdf', icon: 'picture_as_pdf', label: 'PDF' },
];

const Reports = () => {
  const [loading, setLoading] = useState('');

  const download = async (type, format, title) => {
    setLoading(`${type}-${format}`);
    try {
      const res = await reportService.exportReport(type, format);
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinelx-${type}-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`${title} (${format.toUpperCase()}) downloaded!`);
    } catch {
      toast.error('Failed to generate report. Try again.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export security reports in multiple formats</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 20 }}>
        {REPORTS.map(report => (
          <div key={report.id} className="card-glass">
            <div className="card-body-custom">
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: report.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ color: 'white' }}>{report.icon}</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>{report.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{report.desc}</div>
                </div>
              </div>
              <div className="cyber-divider" />
              <div style={{ display: 'flex', gap: 8 }}>
                {FORMATS.map(({ fmt, icon, label }) => {
                  const key = `${report.id}-${fmt}`;
                  const isLoading = loading === key;
                  return (
                    <button
                      key={fmt}
                      className="btn-outline-custom"
                      style={{ flex: 1, justifyContent: 'center', padding: '8px 10px', fontSize: '0.78rem', gap: 6 }}
                      onClick={() => download(report.id, fmt, report.title)}
                      disabled={!!loading}
                    >
                      {isLoading ? (
                        <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <span className="material-icons" style={{ fontSize: '0.9rem' }}>{icon}</span>
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
