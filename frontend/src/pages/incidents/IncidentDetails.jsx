import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/common/Badge';
import Timeline from '../../components/common/Timeline';
import { formatDateTime, formatRelativeTime, formatFileSize } from '../../utils/formatters';
import { toast } from 'react-toastify';

const STATUSES = ['open','assigned','investigating','under_review','resolved','closed'];

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.role_name;
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('observation');
  const [addingNote, setAddingNote] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);

  useEffect(() => { loadIncident(); }, [id]);

  const loadIncident = async () => {
    setLoading(true);
    try {
      const data = await incidentService.getById(id);
      if (data.success) setIncident(data.data);
    } catch {
      toast.error('Failed to load incident');
      navigate('/incidents/my');
    } finally { setLoading(false); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setAddingNote(true);
    try {
      const data = await incidentService.addNote(id, { content: noteContent, note_type: noteType });
      if (data.success) {
        setIncident(prev => ({ ...prev, notes: [...(prev.notes || []), data.data] }));
        setNoteContent('');
        toast.success('Note added');
      }
    } catch { toast.error('Failed to add note'); }
    finally { setAddingNote(false); }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdatingStatus(true);
    try {
      const data = await incidentService.updateStatus(id, { status: newStatus, reason: statusReason });
      if (data.success) {
        loadIncident();
        toast.success('Status updated');
        setNewStatus('');
        setStatusReason('');
      }
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const data = await incidentService.uploadEvidence(id, formData);
      if (data.success) {
        toast.success('Evidence uploaded successfully');
        loadIncident();
      }
    } catch {
      toast.error('Failed to upload evidence');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAIAnalyze = async () => {
    setAnalyzingAI(true);
    try {
      const data = await incidentService.aiAnalyze(id);
      if (data.success) {
        toast.success('AI Analysis complete');
        loadIncident();
      }
    } catch {
      toast.error('Failed to trigger AI Analysis');
    } finally {
      setAnalyzingAI(false);
    }
  };


  if (loading) return <div className="page-loader" style={{ minHeight: 400 }}><div className="loader-ring" /></div>;
  if (!incident) return <div className="no-data"><span className="material-icons">error</span><p>Incident not found</p></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: '0.82rem' }}>
            <span className="material-icons" style={{ fontSize: '1rem' }}>arrow_back</span> Back
          </button>
          <h1 className="page-title" style={{ fontSize: '1.1rem' }}>{incident.title}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <code style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>{incident.incident_ref}</code>
            <Badge type="severity" value={incident.severity} />
            <Badge type="status" value={incident.status} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* LEFT */}
        <div>
          {/* Description */}
          <div className="card-glass" style={{ marginBottom: 20 }}>
            <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Description</span></div>
            <div className="card-body-custom">
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{incident.description}</p>
              {incident.affected_systems && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Affected Systems</div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>{incident.affected_systems}</p>
                </div>
              )}
              {(incident.source_ip || incident.target_ip || incident.affected_users_count > 0) && (
                <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
                  {incident.source_ip && (
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source IP</div>
                    <code style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>{incident.source_ip}</code></div>
                  )}
                  {incident.target_ip && (
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target IP</div>
                    <code style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem' }}>{incident.target_ip}</code></div>
                  )}
                  {incident.affected_users_count > 0 && (
                    <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Affected Users</div>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '1rem', color: 'var(--accent-red)' }}>{incident.affected_users_count}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Risk Score */}
          {incident.risk_score != null && (
            <div className="card-glass" style={{ marginBottom: 20 }}>
              <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Risk Assessment</span></div>
              <div className="card-body-custom">
                <div className="risk-gauge">
                  <div className="risk-bar">
                    <div className={`risk-bar-fill ${incident.risk_level}`} style={{ width: `${incident.risk_score}%` }} />
                  </div>
                  <span style={{ fontFamily: 'Orbitron', fontWeight: 800, fontSize: '1.2rem', color: incident.risk_level === 'critical' ? '#ef4444' : incident.risk_level === 'high' ? '#f97316' : incident.risk_level === 'medium' ? '#f59e0b' : '#10b981' }}>
                    {incident.risk_score}
                  </span>
                  <Badge type="severity" value={incident.risk_level} />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card-glass" style={{ marginBottom: 20 }}>
            <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Investigation Notes</span>
                <span className="badge-custom badge-info" style={{ marginLeft: 8 }}>{incident.notes?.length || 0}</span>
              </div>
              {(role === 'admin' || role === 'analyst') && (
                <button 
                  className="btn-outline-custom" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
                  onClick={handleAIAnalyze}
                  disabled={analyzingAI}
                >
                  <span className="material-icons" style={{ fontSize: '1rem', marginRight: 4 }}>psychology</span>
                  {analyzingAI ? 'Analyzing...' : 'AI Analyze'}
                </button>
              )}
            </div>
            <div className="card-body-custom">
              {!incident.notes?.length && (
                <div className="no-data" style={{ padding: 24 }}><span className="material-icons">notes</span><p>No notes yet</p></div>
              )}
              {incident.notes?.map(note => (
                <div key={note.note_id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                    {note.analyst?.full_name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.82rem' }}>{note.analyst?.full_name}</strong>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="badge-custom badge-purple" style={{ fontSize: '0.68rem' }}>{note.note_type}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatRelativeTime(note.created_at)}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{note.content}</p>
                  </div>
                </div>
              ))}
              {(role === 'analyst' || role === 'admin') && (
                <form onSubmit={handleAddNote} style={{ marginTop: 16, borderTop: '1px solid var(--border-card)', paddingTop: 16 }}>
                  <select className="form-control-custom" style={{ maxWidth: 200, marginBottom: 8 }} value={noteType} onChange={e => setNoteType(e.target.value)}>
                    {['observation','finding','action','recommendation','evidence_analysis'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                  <textarea className="form-control-custom" rows={3} placeholder="Add investigation note..."
                    value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                  <button type="submit" className="btn-primary-custom" style={{ marginTop: 8 }} disabled={addingNote}>
                    <span className="material-icons" style={{ fontSize: '1rem' }}>send</span>
                    {addingNote ? 'Adding...' : 'Add Note'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Evidence */}
          <div className="card-glass">
            <div className="card-header-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Evidence</span>
                <span className="badge-custom badge-info" style={{ marginLeft: 8 }}>{incident.evidence?.length || 0}</span>
              </div>
              <label className="btn-outline-custom" style={{ padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-icons" style={{ fontSize: '1rem' }}>upload_file</span>
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            <div className="card-body-custom">
              {!incident.evidence?.length && (
                <div className="no-data" style={{ padding: 24 }}><span className="material-icons">folder_open</span><p>No evidence uploaded</p></div>
              )}
              {incident.evidence?.map(ev => (
                <div key={ev.evidence_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border-card)' }}>
                  <span className="material-icons" style={{ color: 'var(--accent-cyan)' }}>insert_drive_file</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{ev.original_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {formatFileSize(ev.file_size)} • {ev.file_type} • {ev.uploader?.full_name}
                    </div>
                  </div>
                  <a href={`/uploads/evidence/${ev.file_name}`} download
                    className="btn-outline-custom" style={{ padding: '4px 10px', fontSize: '0.78rem', textDecoration: 'none' }}>
                    <span className="material-icons" style={{ fontSize: '0.9rem' }}>download</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Meta Details */}
          <div className="card-glass" style={{ marginBottom: 16 }}>
            <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Details</span></div>
            <div className="card-body-custom">
              {[
                { label: 'Type', value: incident.incidentType?.type_name },
                { label: 'Reporter', value: incident.reporter?.full_name },
                { label: 'Department', value: incident.reporter?.department || 'N/A' },
                { label: 'Location', value: incident.location || 'N/A' },
                { label: 'Reported', value: formatDateTime(incident.created_at) },
                { label: 'Resolved', value: incident.resolved_at ? formatDateTime(incident.resolved_at) : 'Not yet' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-card)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              {incident.assignments?.[0] && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Analyst</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {incident.assignments[0].analyst?.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Update */}
          {(role === 'analyst' || role === 'admin') && (
            <div className="card-glass" style={{ marginBottom: 16 }}>
              <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Update Status</span></div>
              <div className="card-body-custom">
                <select className="form-control-custom" style={{ marginBottom: 10 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Select new status...</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <textarea className="form-control-custom" rows={2} placeholder="Reason (optional)"
                  value={statusReason} onChange={e => setStatusReason(e.target.value)} />
                <button className="btn-primary-custom" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                  onClick={handleStatusUpdate} disabled={!newStatus || updatingStatus}>
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card-glass">
            <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Status Timeline</span></div>
            <div className="card-body-custom">
              <Timeline statusLogs={incident.statusLogs || incident.status_logs || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
