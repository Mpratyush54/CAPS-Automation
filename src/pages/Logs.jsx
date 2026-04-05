import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PlusCircle, Search, Edit2, Trash2, Clock, CheckCircle,
  Eye, X, Save, XCircle, AlertCircle, Info, Send, Loader2, Activity
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, formatDateTime, getErrorMessage, unwrap } from '../lib/api';
import { normalizeLog } from '../lib/adapters';
import { TableSkeleton, CardSkeleton } from '../components/Skeleton';

const STATUS_META = {
  'draft': { label: 'Draft', badge: 'badge-neutral' },
  'pending_review': { label: 'Pending Review', badge: 'badge-primary' },
  'needs_revision': { label: 'Needs Revision', badge: 'badge-error' },
  'approved': { label: 'Approved', badge: 'badge-success' },
  'completed': { label: 'Approved', badge: 'badge-success' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, badge: 'badge-neutral' };
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
};

/* -------------------- MODALS -------------------- */

const Modal = ({ title, onClose, children, maxWidth = '520px' }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ maxWidth }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', padding: '0.25rem', borderRadius: '0.375rem' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const LogFormModal = ({ initial, teams, onClose, onSave, role, user }) => {
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isVolunteer = !isAdmin;

  const [form, setForm] = useState({
    title: initial?.title || '',
    date: initial?.date || new Date().toISOString().split('T')[0],
    hours: initial?.hours || '1',
    minutes: initial?.minutes || '0',
    teamId: initial?.teamId || user?.teamId || '',
    notes: initial?.description || initial?.notes || '',
    status: initial?.status || 'draft',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isVolunteer && user?.teamId) {
      set('teamId', user.teamId);
    }
  }, [user]);

  const handleSave = (nextStatus) => {
    onSave({
      ...initial,
      ...form,
      status: nextStatus || form.status
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Edit Log Entry' : 'New Log Entry'} onClose={onClose}>
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div>
          <label className="input-label">Activity Title *</label>
          <input
            className="input-field"
            placeholder="What were you working on?"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label">Date *</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="input-label">Hours</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.hours}
                onChange={(e) => set('hours', e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">Mins</label>
              <input
                type="number"
                min="0"
                max="59"
                className="input-field"
                value={form.minutes}
                onChange={(e) => set('minutes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="input-label">Select Team *</label>
            <select
              className="input-field"
              value={form.teamId}
              onChange={(e) => set('teamId', e.target.value)}
              required
            >
              <option value="">Select Team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.type === 'wing' ? 'Wing' : 'Comm'}] {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isVolunteer && (
          <div style={{ padding: '0.75rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
            <p style={{ margin: 0 }}>
              <strong>Assigned Team:</strong><br />
              {!form.teamId 
                ? <span style={{ color: 'var(--color-error)' }}>No team assigned. Please contact your administrator.</span>
                : (teams.find(t => String(t.id) === String(form.teamId))?.name || 'Loading organization info...')
              } 
            </p>
          </div>
        )}

        <div>
          <label className="input-label">Notes / Description</label>
          <textarea
            className="input-field"
            rows={4}
            placeholder="Details about your work..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          {form.status !== 'approved' && form.status !== 'completed' && (
            <button className="btn-ghost" onClick={() => handleSave('draft')} style={{ flex: 1, border: '1px solid var(--color-outline)' }}>
               <Save size={14} /> Draft
            </button>
          )}
          <button className="btn-primary" onClick={() => handleSave('pending_review')} style={{ flex: 1.5 }}>
            <Send size={14} /> Submit
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ViewModal = ({ log, onClose }) => (
  <Modal title="Log Detail" onClose={onClose} maxWidth="600px">
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>{log.title}</h3>
          <StatusBadge status={log.status} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
           <p style={{ margin: 0 }}><strong>{log.date}</strong></p>
           <p style={{ margin: 0 }}>{log.duration}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.875rem' }}>
        <div style={{ gridColumn: 'span 2', padding: '1rem', background: 'var(--color-surface-low)', borderRadius: '0.75rem', border: '1px solid var(--color-outline-variant)' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
             <div><p className="input-label" style={{ marginBottom: '0.25rem' }}>Assigned Unit</p><p style={{ margin: 0, fontWeight: 500 }}>{log.team?.name || log.committee || '-'}</p></div>
             {log.submitter && <div><p className="input-label" style={{ marginBottom: '0.25rem' }}>Submitted By</p><p style={{ margin: 0, fontWeight: 500 }}>{log.submitter}</p></div>}
          </div>
        </div>
      </div>

      {(log.description || log.notes) && (
        <div style={{ padding: '0.5rem 0' }}>
          <p className="input-label">Description / Work Completed</p>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{log.description || log.notes}</p>
        </div>
      )}

      {log.tlComment && (
        <div style={{ padding: '1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={16} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Reviewer Request for Revision</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>{log.tlComment}</p>
        </div>
      )}

      <div className="modal-actions" style={{ justifyContent: 'center', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '1.25rem' }}>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '0.625rem 2rem' }}>Close</button>
      </div>
    </div>
  </Modal>
);

const RejectModal = ({ log, onReject, onClose }) => {
  const [comment, setComment] = useState('');
  return (
    <Modal title="Request Revision" onClose={onClose}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Please provide a reason for requesting a revision for <strong>{log.title}</strong>.
        </p>
        <textarea
          className="input-field"
          rows={4}
          autoFocus
          placeholder="What needs to be changed?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }} disabled={!comment.trim()} onClick={() => onReject(log.id, 'reject', comment)}>
            Confirm Reject
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ConfirmDelete = ({ log, onConfirm, onClose }) => (
  <Modal title="Confirm Delete" onClose={onClose} maxWidth="400px">
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ padding: '0.75rem', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: '50%' }}><Trash2 size={24} /></div>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Delete log entry?</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>Are you sure you want to delete <strong>{log.title}</strong>? This action cannot be undone.</p>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => { onConfirm(log.id); onClose(); }}>Delete Forever</button>
      </div>
    </div>
  </Modal>
);

/* -------------------- MAIN PAGE -------------------- */

const Logs = () => {
  const location = useLocation();
  const { role, user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [freshUser, setFreshUser] = useState(user);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  // Deep Link Support: If URL has ?search=..., apply it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('search');
    if (s) {
      setSearch(decodeURIComponent(s));
    }
  }, [location.search]);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const response = await api.get('/api/organization/teams');
        const payload = unwrap(response);
        setTeams((payload?.rows || []).map(t => ({ ...t, id: t._id || t.id })));
      } catch (e) {
        console.error('Failed to load teams', e);
      }
    };
    loadOrg();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadLogs = async () => {
      setLoading(true);
      try {
        const uRes = await api.get('/api/profile/me');
        const latestInfo = unwrap(uRes);
        if (mounted && latestInfo?.user) setFreshUser(latestInfo.user);

        const params = {};
        if (filter !== 'all') params.status = filter;
        const response = await api.get('/api/logs', { params });
        const rows = unwrap(response).rows || [];
        if (mounted) {
          setLogs(rows.map(row => normalizeLog(row, user?.id)));
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load logs.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadLogs();
    return () => { mounted = false; };
  }, [filter, user?.id]);

  const filtered = logs.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.submitter || '').toLowerCase().includes(search.toLowerCase())
  );

  const saveLog = async (data) => {
    setError(null);
    try {
      const isEdit = !!data.id;
      const endpoint = isEdit ? `/api/logs/${data.id}` : '/api/logs';
      const method = isEdit ? 'patch' : 'post';

      const payload = {
        title: data.title,
        description: data.notes,
        workDate: new Date(data.date).toISOString(),
        durationMinutes: Number(data.hours) * 60 + Number(data.minutes),
        teamId: data.teamId || undefined,
        status: data.status,
      };

      const response = await api[method](endpoint, payload);
      const saved = normalizeLog(unwrap(response), user?.id);

      setLogs(prev => isEdit
        ? prev.map(l => l.id === saved.id ? saved : l)
        : [saved, ...prev]
      );
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save log.'));
    }
  };

  const deleteLog = async (id) => {
    try {
      await api.delete(`/api/logs/${id}`);
      setLogs(prev => prev.filter(l => l.id !== id));
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete log.'));
    }
  };

  const reviewAction = async (id, action, comment = '') => {
    try {
      const response = await api.post(`/api/logs/${id}/${action}`, { comment });
      const updated = normalizeLog(unwrap(response), user?.id);
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
      setModal(null);
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${action} log.`));
    }
  };

  return (
    <>
      <TopBar title="Work Logs" />
      <div className="page-body">
        {error && (
          <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '0.625rem', fontSize: '0.8125rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
             </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ color: 'var(--color-outline)' }} />
            <input placeholder="Search activities or members..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="card-action-row" style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {['all', 'draft', 'pending_review', 'needs_revision', 'approved'].map(v => (
              <button key={v} className={`chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {v.replace('_', ' ').charAt(0).toUpperCase() + v.replace('_', ' ').slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })} style={{ padding: '0.625rem 1.25rem' }}><PlusCircle size={16} /> New Entry</button>
        </div>

        {/* DESKTOP VIEW */}
        <div className="desktop-log-table card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                {role !== ROLES.VOLUNTEER && <th>Member</th>}
                <th>Activity</th>
                <th>Date</th>
                <th>Duration</th>
                {role !== ROLES.VOLUNTEER && <th>Unit</th>}
                <th>Status</th>
                {role === ROLES.TEAM_LEAD && <th>Review Note</th>}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <TableSkeleton rows={8} cols={role === ROLES.VOLUNTEER ? 6 : 8} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-on-surface-variant)' }}>No logs for '{filter}'{search ? ` matching '${search}'` : ''}.</td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} style={{
                  background: log.status === 'Needs Revision' && log.isOwn ? 'var(--color-error-container)' : undefined,
                  opacity: log.status === 'Needs Revision' && log.isOwn ? 0.95 : 1
                }}>
                  {role !== ROLES.VOLUNTEER && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="avatar" style={{ width: '1.625rem', height: '1.625rem', fontSize: '0.65rem' }}>{(log.submitter || '?')[0]}</div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: log.isOwn ? 600 : 400 }}>{log.submitter}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {log.title}
                      {log.status === 'Needs Revision' && log.isOwn && <AlertCircle size={13} style={{ color: 'var(--color-error)' }} />}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{log.date}</td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={12} style={{ color: 'var(--color-outline)' }} /> {log.duration}</span>
                  </td>
                  {role !== ROLES.VOLUNTEER && (
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{log.team?.name || log.committee || '-'}</td>
                  )}
                  <td><StatusBadge status={log.status} /></td>
                  {role === ROLES.TEAM_LEAD && (
                    <td style={{ maxWidth: '160px' }}>
                      {log.tlComment ? (
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--color-on-surface-variant)' }}>{log.tlComment}</span>
                      ) : <span style={{ opacity: 0.2 }}>-</span>}
                    </td>
                  )}
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="btn-ghost" title="View details" onClick={() => setModal({ type: 'view', log })}><Eye size={14} /></button>
                      {log.isOwn && log.status !== 'approved' && log.status !== 'completed' && (
                        <button className="btn-ghost" title="Edit" onClick={() => setModal({ type: 'edit', log })} style={{ color: 'var(--color-primary)' }}><Edit2 size={14} /></button>
                      )}
                      {can(role, 'approveLog') && !log.isOwn && (
                        <>
                          {log.status === 'pending_review' && (
                            <button style={{ color: 'var(--color-success)' }} className="btn-ghost" title="Approve" onClick={() => reviewAction(log.id, 'approve')}><CheckCircle size={14} /></button>
                          )}
                          {log.status === 'pending_review' && (
                            <button style={{ color: 'var(--color-error)' }} className="btn-ghost" title="Request Revision" onClick={() => setModal({ type: 'reject', log })}><XCircle size={14} /></button>
                          )}
                          {(log.status === 'approved' || log.status === 'needs_revision') && (
                            <button style={{ color: 'var(--color-primary)' }} className="btn-ghost" title="Mark as Pending" onClick={() => reviewAction(log.id, 'submit')}><Activity size={14} /></button>
                          )}
                        </>
                      )}
                      {log.isOwn && (log.status === 'draft' || log.status === 'needs_revision') && (
                        <button style={{ color: 'var(--color-error)' }} className="btn-ghost" title="Delete" onClick={() => setModal({ type: 'delete', log })}><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST */}
        <div className="mobile-log-list">
          {loading && logs.length === 0 ? (
            <CardSkeleton count={5} />
          ) : filtered.length === 0 && !loading ? (
             <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-on-surface-variant)' }}>No logs for '{filter}'{search ? ` matching '${search}'` : ''}.</div>
          ) : filtered.map((log) => (
            <div key={log.id} className={`log-card ${log.status === 'Needs Revision' && log.isOwn ? 'needs-revision' : ''}`} style={{
              background: log.status === 'Needs Revision' && log.isOwn ? 'var(--color-error-container)' : 'var(--color-surface)',
              borderRadius: '0.875rem',
              padding: '1.125rem',
              marginBottom: '0.875rem',
              border: log.status === 'Needs Revision' && log.isOwn ? '1px solid var(--color-error)' : '1px solid var(--color-outline-variant)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                   {log.title}
                   {log.status === 'Needs Revision' && log.isOwn && <AlertCircle size={13} style={{ color: 'var(--color-error)' }} />}
                </span>
                <StatusBadge status={log.status} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} /> {log.duration}</span>
                <span>{log.date}</span>
                {role !== ROLES.VOLUNTEER && <span style={{ fontWeight: 600 }}>{log.submitter}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '0.75rem' }}>
                  <button className="btn-ghost" onClick={() => setModal({ type: 'view', log })}><Eye size={16} /></button>
                  {log.isOwn && log.status !== 'approved' && log.status !== 'completed' && (
                    <button className="btn-ghost" onClick={() => setModal({ type: 'edit', log })} style={{ color: 'var(--color-primary)' }}><Edit2 size={16} /></button>
                  )}
                  {can(role, 'approveLog') && !log.isOwn && (
                    <>
                      {log.status === 'pending_review' && (
                        <button style={{ color: 'var(--color-success)' }} className="btn-ghost" onClick={() => reviewAction(log.id, 'approve')}><CheckCircle size={16} /></button>
                      )}
                      {log.status === 'pending_review' && (
                        <button style={{ color: 'var(--color-error)' }} className="btn-ghost" onClick={() => setModal({ type: 'reject', log })}><XCircle size={16} /></button>
                      )}
                    </>
                  )}
                  {log.isOwn && (log.status === 'draft' || log.status === 'needs_revision') && (
                    <button style={{ color: 'var(--color-error)' }} className="btn-ghost" onClick={() => setModal({ type: 'delete', log })}><Trash2 size={16} /></button>
                  )}
              </div>
            </div>
          ))}
        </div>

        <button className="fab" onClick={() => setModal({ type: 'add' })} title="Add Log Entry"><PlusCircle size={24} /></button>

        {/* MODAL DISPATCHER */}
        {modal?.type === 'add' && <LogFormModal teams={teams} role={role} user={freshUser} onClose={() => setModal(null)} onSave={saveLog} />}
        {modal?.type === 'edit' && <LogFormModal initial={modal.log} teams={teams} role={role} user={freshUser} onClose={() => setModal(null)} onSave={saveLog} />}
        {modal?.type === 'view' && <ViewModal log={modal.log} onClose={() => setModal(null)} />}
        {modal?.type === 'reject' && <RejectModal log={modal.log} onClose={() => setModal(null)} onReject={reviewAction} />}
        {modal?.type === 'delete' && <ConfirmDelete log={modal.log} onClose={() => setModal(null)} onConfirm={deleteLog} />}
      </div>
    </>
  );
};

export default Logs;
