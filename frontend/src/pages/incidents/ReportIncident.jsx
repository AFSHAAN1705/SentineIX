import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { toast } from 'react-toastify';

const INCIDENT_TYPES = [
  { id: 1, name: 'Phishing' }, { id: 2, name: 'Malware' }, { id: 3, name: 'Ransomware' },
  { id: 4, name: 'DDoS' }, { id: 5, name: 'Data Breach' }, { id: 6, name: 'Credential Theft' },
  { id: 7, name: 'Insider Threat' }, { id: 8, name: 'Unauthorized Access' },
  { id: 9, name: 'Social Engineering' }, { id: 10, name: 'Zero-Day Exploit' },
];

const ReportIncident = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    title: '', type_id: '', severity: 'medium', description: '',
    affected_systems: '', affected_users_count: 0, source_ip: '', target_ip: '', location: '',
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    incidentService.getTypes().then(r => setTypes(r?.data || [])).catch(() => {});
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.title || form.title.length < 5) errs.title = 'Title must be at least 5 characters';
    if (!form.type_id) errs.type_id = 'Select an incident type';
    if (!form.description || form.description.length < 20) errs.description = 'Description too short (min 20 chars)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await incidentService.create(form);
      if (result.success && files.length > 0) {
        const incId = result.data.incident_id;
        for (const file of files) {
          const fd = new FormData();
          fd.append('file', file);
          await incidentService.uploadEvidence(incId, fd).catch(() => {});
        }
      }
      toast.success(`Incident ${result.data?.incident_ref} reported successfully!`);
      navigate(`/incidents/${result.data?.incident_id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report incident');
    } finally {
      setLoading(false);
    }
  };

  const addFiles = (fileList) => setFiles(prev => [...prev, ...Array.from(fileList)]);
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="animate-fade-in" style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Incident</h1>
          <p className="page-subtitle">Submit a new cyber security incident for investigation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="card-glass" style={{ marginBottom: 20 }}>
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>
              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>info</span>
              Incident Information
            </span>
          </div>
          <div className="card-body-custom">
            <div className="form-group-custom">
              <label className="form-label-custom">Incident Title *</label>
              <input type="text" className="form-control-custom"
                placeholder="Brief, descriptive title of the incident"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              {errors.title && <div className="form-error"><span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>{errors.title}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Incident Type *</label>
                <select className="form-control-custom" value={form.type_id}
                  onChange={e => setForm({ ...form, type_id: e.target.value })}>
                  <option value="">-- Select Type --</option>
                  {(types.length > 0 ? types : INCIDENT_TYPES).map(t => <option key={t.type_id || t.id} value={t.type_id || t.id}>{t.type_name || t.name}</option>)}
                </select>
                {errors.type_id && <div className="form-error"><span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>{errors.type_id}</div>}
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Severity Level *</label>
                <select className="form-control-custom" value={form.severity}
                  onChange={e => setForm({ ...form, severity: e.target.value })}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                  <option value="critical">⚠️ Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group-custom">
              <label className="form-label-custom">Description *</label>
              <textarea className="form-control-custom" rows={5}
                placeholder="Describe the incident in detail: what happened, when noticed, what systems are affected, any indicators of compromise..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              {errors.description && <div className="form-error"><span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>{errors.description}</div>}
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card-glass" style={{ marginBottom: 20 }}>
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>
              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>computer</span>
              Technical Details (Optional)
            </span>
          </div>
          <div className="card-body-custom">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Source IP</label>
                <input type="text" className="form-control-custom" placeholder="e.g. 192.168.1.100"
                  value={form.source_ip} onChange={e => setForm({ ...form, source_ip: e.target.value })} />
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Target IP</label>
                <input type="text" className="form-control-custom" placeholder="e.g. 10.0.0.1"
                  value={form.target_ip} onChange={e => setForm({ ...form, target_ip: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Affected Systems</label>
                <input type="text" className="form-control-custom" placeholder="Mail server, Database, Workstations..."
                  value={form.affected_systems} onChange={e => setForm({ ...form, affected_systems: e.target.value })} />
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Affected Users</label>
                <input type="number" className="form-control-custom" placeholder="0" min={0}
                  value={form.affected_users_count}
                  onChange={e => setForm({ ...form, affected_users_count: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="form-group-custom">
              <label className="form-label-custom">Location</label>
              <input type="text" className="form-control-custom" placeholder="Office, city, or remote"
                value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Evidence */}
        <div className="card-glass" style={{ marginBottom: 20 }}>
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>
              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: 6 }}>attach_file</span>
              Evidence Upload (Optional)
            </span>
          </div>
          <div className="card-body-custom">
            <div
              className={`file-upload-zone${dragOver ? ' drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <span className="material-icons" style={{ fontSize: '2.5rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: 8 }}>cloud_upload</span>
              <div className="file-upload-text">Drag & drop files here, or click to browse</div>
              <div className="file-upload-hint">Images, PDF, Word, ZIP, Video — max 10MB each</div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                onChange={e => addFiles(e.target.files)} />
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,245,255,0.05)', borderRadius: 6, marginBottom: 4, border: '1px solid var(--border-card)' }}>
                    <span className="material-icons" style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>insert_drive_file</span>
                    <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{f.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => removeFile(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex' }}>
                      <span className="material-icons" style={{ fontSize: '1rem' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline-custom" onClick={() => navigate(-1)}>Cancel</button>
          <button id="report-incident-btn" type="submit" className="btn-primary-custom" disabled={loading}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Submitting...</>
            ) : (
              <><span className="material-icons" style={{ fontSize: '1.1rem' }}>add_alert</span> Submit Incident</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIncident;
