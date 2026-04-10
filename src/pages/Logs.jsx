import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PlusCircle, Edit2, Trash2, Clock, CheckCircle,
  Eye, Save, XCircle, Info, Send, Activity, Shield, ChevronRight
} from 'lucide-react';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { formatDateTime } from '../lib/api';
import { TableSkeleton, CardSkeleton } from '../components/Skeleton';

// UI Components
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

// Hooks
import { useLogs, useCreateLog, useUpdateLog, useDeleteLog, useReviewLog } from '../hooks/useLogs';
import { useTeams } from '../hooks/useOrganization';
import { useProfile } from '../hooks/useProfile';

const STATUS_META = {
  'draft': { label: 'Draft', variant: 'neutral' },
  'pending_review': { label: 'Pending Review', variant: 'primary' },
  'needs_revision': { label: 'Needs Revision', variant: 'error' },
  'approved': { label: 'Approved', variant: 'success' },
  'completed': { label: 'Approved', variant: 'success' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, variant: 'neutral' };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

/* -------------------- MODALS -------------------- */

const LogFormModal = ({ initial, teams, onClose, onSave, role, user }) => {
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isVolunteer = !isAdmin;

  const [form, setForm] = useState({
    title: initial?.title || '',
    date: (initial?.workDate ? initial.workDate.split('T')[0] : (initial?.date || new Date().toISOString().split('T')[0])),
    hours: initial?.durationMinutes ? Math.floor(initial.durationMinutes / 60) : (initial?.hours || '1'),
    minutes: initial?.durationMinutes ? (initial.durationMinutes % 60) : (initial?.minutes || '0'),
    teamId: initial?.teamId || user?.teamId || '',
    notes: initial?.description || initial?.notes || '',
    status: initial?.status || 'draft',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isVolunteer && user?.teamId && !form.teamId) {
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
    <Modal title={initial ? 'Modify Log Entry' : 'Mission Deployment Log'} onClose={onClose}>
      <div style={{ display: 'grid', gap: '1.5rem', background: 'var(--color-surface-lowest)', padding: '0.25rem' }}>
        <div className="input-group">
          <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activity Directive *</label>
          <input
            className="input-field"
            placeholder="Operational title..."
            style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Mission Date *</label>
            <input
              type="date"
              className="input-field"
              style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem' }}>HH</label>
              <input
                type="number"
                min="0"
                className="input-field"
                style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
                value={form.hours}
                onChange={(e) => set('hours', e.target.value)}
              />
            </div>
            <div>
              <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem' }}>MM</label>
              <input
                type="number"
                min="0"
                max="59"
                className="input-field"
                style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
                value={form.minutes}
                onChange={(e) => set('minutes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Strategic Unit *</label>
            <select
              className="input-field"
              value={form.teamId}
              style={{ borderRadius: '12px', background: 'var(--color-surface-low)' }}
              onChange={(e) => set('teamId', e.target.value)}
              required
            >
              <option value="">Select Protocol Unit</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.type?.toUpperCase()}] {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isVolunteer && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--color-primary-fixed-dim)', borderRadius: '12px', border: '1px solid var(--color-primary-fixed)', fontSize: '0.8rem' }}>
            <p style={{ margin: 0, color: 'var(--color-on-primary-fixed-variant)', fontWeight: 600 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.7 }}>UNIT ASSIGNMENT:</span><br />
              {!form.teamId
                ? <span style={{ color: 'var(--color-error)' }}>UNASSIGNED - CONTACT HQ</span>
                : (teams.find(t => String(t.id) === String(form.teamId))?.name || 'SYNCING ORGANIZATION...')
              }
            </p>
          </div>
        )}

        <div>
          <label className="input-label" style={{ fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Operational Notes</label>
          <textarea
            className="input-field"
            rows={4}
            style={{ borderRadius: '12px', background: 'var(--color-surface-low)', resize: 'none' }}
            placeholder="Details of progress and results..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: '0.5rem', gap: '8px' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, borderRadius: '12px' }}>Cancel</button>
          {form.status !== 'approved' && form.status !== 'completed' && (
            <button className="btn-secondary" onClick={() => handleSave('draft')} style={{ flex: 1, borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem' }}>
              <Save size={14} /> Draft
            </button>
          )}
          <button className="btn-primary" onClick={() => handleSave('pending_review')} style={{ flex: 1.5, borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem' }}>
            <Send size={14} /> Submit Mission
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ViewModal = ({ log, onClose }) => (
  <Modal title="Artifact Insight" onClose={onClose} maxWidth="600px">
    <div style={{ display: 'grid', gap: '1.5rem', background: 'var(--color-surface-lowest)', padding: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>{log.title}</h3>
          <StatusBadge status={log.status} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          <p style={{ margin: 0, fontWeight: 800, letterSpacing: '0.5px' }}>{log.date}</p>
          <p style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}><Clock size={12} /> {log.duration}</p>
        </div>
      </div>

      <div style={{ padding: '1.25rem', background: 'var(--color-surface-low)', borderRadius: '16px', border: '1px solid var(--color-outline-variant)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div><p className="input-label" style={{ fontSize: '0.65rem', fontWeight: 800, marginBottom: '4px' }}>UNIT</p><p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface)' }}>{log.team?.name || log.committee || '-'}</p></div>
          {log.submitter && <div><p className="input-label" style={{ fontSize: '0.65rem', fontWeight: 800, marginBottom: '4px' }}>OPERATIVE</p><p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface)' }}>{log.submitter}</p></div>}
        </div>
      </div>

      {(log.description || log.notes) && (
        <div style={{ padding: '0.5rem 0' }}>
          <p className="input-label" style={{ fontSize: '0.65rem', fontWeight: 800, marginBottom: '8px' }}>MISSION BRIEF</p>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--color-on-surface)', whiteSpace: 'pre-line' }}>{log.description || log.notes}</p>
        </div>
      )}

      {log.tlComment && (
        <Alert variant="error" style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>HQ Revision Directive:</div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{log.tlComment}</div>
        </Alert>
      )}

      <div className="modal-actions" style={{ justifyContent: 'center', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '1.5rem' }}>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '0.75rem 3rem', borderRadius: '12px', fontWeight: 800 }}>Close Signal</button>
      </div>
    </div>
  </Modal>
);

const RejectModal = ({ log, onReject, onClose }) => {
  const [comment, setComment] = useState('');
  return (
    <Modal title="Mission Revision" onClose={onClose}>
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          Specify the directives for revision for artifact <strong>{log.title}</strong>.
        </p>
        <textarea
          className="input-field"
          rows={4}
          autoFocus
          style={{ borderRadius: '12px', background: 'var(--color-surface-low)', resize: 'none' }}
          placeholder="Detailed revision criteria..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="modal-actions" style={{ gap: '8px' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, borderRadius: '12px' }}>Cancel</button>
          <button className="btn-primary" style={{ flex: 1.5, background: 'var(--color-error)', borderColor: 'var(--color-error)', borderRadius: '12px', fontWeight: 800 }} disabled={!comment.trim()} onClick={() => onReject(log.id, 'reject', comment)}>
            Issue Directive
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ConfirmDelete = ({ log, onConfirm, onClose }) => (
  <Modal title="Purge Artifact" onClose={onClose} maxWidth="400px">
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-error-container)', color: 'var(--color-error)', borderRadius: '14px' }}><Trash2 size={24} /></div>
        <div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 800 }}>Confirm Purge?</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Deleting <strong>{log.title}</strong> is irreversible.</p>
        </div>
      </div>
      <div className="modal-actions" style={{ gap: '8px' }}>
        <button className="btn-ghost" onClick={onClose} style={{ flex: 1, borderRadius: '12px' }}>Cancel</button>
        <button className="btn-primary" style={{ flex: 1.5, background: 'var(--color-error)', borderColor: 'var(--color-error)', borderRadius: '12px', fontWeight: 800 }} onClick={() => { onConfirm(log.id); onClose(); }}>Confirm Purge</button>
      </div>
    </div>
  </Modal>
);

/* -------------------- MAIN PAGE -------------------- */

const Logs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModal = searchParams.get('modal');
  const selectedLogId = searchParams.get('id');

  const { role, user } = useAuthStore();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading: isLoadingLogs, error: logsError } = useLogs(filter === 'all' ? undefined : filter);
  const { data: teams = [] } = useTeams();
  const { data: profile } = useProfile();
  const freshUser = profile?.user || user;

  const createLogMutation = useCreateLog();
  const updateLogMutation = useUpdateLog();
  const deleteLogMutation = useDeleteLog();
  const reviewLogMutation = useReviewLog();

  const setModal = (m) => {
    if (!m) {
      searchParams.delete('modal');
      searchParams.delete('id');
    } else {
      searchParams.set('modal', m.type);
      if (m.log?.id) searchParams.set('id', m.log.id);
    }
    setSearchParams(searchParams);
  };

  const currentLog = selectedLogId ? logs.find(l => String(l.id) === String(selectedLogId)) : null;

  // Sync search from URL
  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearch(decodeURIComponent(s));
  }, [searchParams]);

  const filtered = logs.filter(l =>
    !search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.submitter || '').toLowerCase().includes(search.toLowerCase())
  );

  const saveLog = async (data) => {
    const isEdit = !!data.id;
    const workDate = new Date(data.date);
    const payload = {
      title: data.title,
      description: data.notes,
      workDate: !Number.isNaN(workDate.getTime()) ? workDate.toISOString() : new Date().toISOString(),
      durationMinutes: Number(data.hours) * 60 + Number(data.minutes),
      teamId: data.teamId || undefined,
      status: data.status,
    };

    if (isEdit) {
      await updateLogMutation.mutateAsync({ id: data.id, logData: payload });
    } else {
      await createLogMutation.mutateAsync(payload);
    }
    setModal(null);
  };

  const deleteLog = async (id) => {
    await deleteLogMutation.mutateAsync(id);
    setModal(null);
  };

  const reviewAction = async (id, action, comment = '') => {
    await reviewLogMutation.mutateAsync({ id, action, comment });
    setModal(null);
  };

  const error = logsError?.message || createLogMutation.error?.message || updateLogMutation.error?.message || deleteLogMutation.error?.message || reviewLogMutation.error?.message;

  return (
    <>
      <TopBar title="Work Logs" />
      <div className="page-body">
        {error && <Alert variant="error">{error}</Alert>}

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBar
            placeholder="Search activities or members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            containerStyle={{ flex: 1, minWidth: '240px', borderRadius: '12px' }}
          />
          <div className="card-action-row" style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {['all', 'draft', 'pending_review', 'needs_revision', 'approved'].map(v => (
              <button key={v} className={`chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {v.replace('_', ' ').charAt(0).toUpperCase() + v.replace('_', ' ').slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })} style={{ padding: '0.625rem 1.25rem', borderRadius: '12px' }}><PlusCircle size={16} /> New Entry</button>
        </div>

        {/* DESKTOP VIEW */}
        <div className="desktop-log-table card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px', border: '1px solid var(--color-outline-variant)' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: 'var(--color-surface-low)' }}>
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
              {isLoadingLogs && logs.length === 0 ? (
                <TableSkeleton rows={8} cols={role === ROLES.VOLUNTEER ? 6 : 8} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '100px' }}><EmptyState title="No logs found" message="No matching operational records secured." /></td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} style={{
                  background: log.status === 'Needs Revision' && log.isOwn ? 'var(--color-error-container)' : undefined,
                }}>
                  {role !== ROLES.VOLUNTEER && (
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="avatar" style={{ width: '1.625rem', height: '1.625rem', fontSize: '0.65rem', fontWeight: 800 }}>{(log.submitter || '?')[0]}</div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: log.isOwn ? 800 : 600 }}>{log.submitter}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {log.title}
                      {log.status === 'Needs Revision' && log.isOwn && <Info size={13} style={{ color: 'var(--color-error)' }} />}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{log.date}</td>
                  <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={12} style={{ color: 'var(--color-primary)' }} /> {log.duration}</span>
                  </td>
                  {role !== ROLES.VOLUNTEER && (
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{log.team?.name || log.committee || '-'}</td>
                  )}
                  <td><StatusBadge status={log.status} /></td>
                  {role === ROLES.TEAM_LEAD && (
                    <td style={{ maxWidth: '160px' }}>
                      {log.tlComment ? (
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{log.tlComment}</span>
                      ) : <span style={{ opacity: 0.2 }}>-</span>}
                    </td>
                  )}
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="btn-icon sm" title="View artifact" onClick={() => setModal({ type: 'view', log })}><Eye size={14} /></button>
                      {log.isOwn && log.status !== 'approved' && log.status !== 'completed' && (
                        <button className="btn-icon sm" title="Modify" onClick={() => setModal({ type: 'edit', log })} style={{ color: 'var(--color-primary)' }}><Edit2 size={14} /></button>
                      )}
                      {can(role, 'approveLog') && !log.isOwn && (
                        <>
                          {log.status === 'pending_review' && (
                            <button style={{ color: 'var(--color-success)' }} className="btn-icon sm" title="Authorize" onClick={() => reviewAction(log.id, 'approve')}><CheckCircle size={14} /></button>
                          )}
                          {log.status === 'pending_review' && (
                            <button style={{ color: 'var(--color-error)' }} className="btn-icon sm" title="Issue Revision" onClick={() => setModal({ type: 'reject', log })}><XCircle size={14} /></button>
                          )}
                        </>
                      )}
                      {log.isOwn && (log.status === 'draft' || log.status === 'needs_revision') && (
                        <button style={{ color: 'var(--color-error)' }} className="btn-icon sm" title="Purge" onClick={() => setModal({ type: 'delete', log })}><Trash2 size={14} /></button>
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
          {isLoadingLogs && logs.length === 0 ? (
            <CardSkeleton count={5} />
          ) : filtered.length === 0 && !isLoadingLogs ? (
            <EmptyState title="Quiet Roster" message="No operational records found for this sector." />
          ) : filtered.map((log) => (
            <div key={log.id} className={`log-card ${log.status === 'Needs Revision' && log.isOwn ? 'needs-revision' : ''}`} style={{
              background: log.status === 'Needs Revision' && log.isOwn ? 'var(--color-error-container)' : 'var(--color-surface-lowest)',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1rem',
              border: log.status === 'Needs Revision' && log.isOwn ? '1px solid var(--color-error)' : '1px solid var(--color-outline-variant)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {log.title}
                  {log.status === 'Needs Revision' && log.isOwn && <Info size={14} style={{ color: 'var(--color-error)' }} />}
                </span>
                <StatusBadge status={log.status} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', flexWrap: 'wrap', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color="var(--color-primary)" /> {log.duration}</span>
                <span>• {log.date}</span>
                {role !== ROLES.VOLUNTEER && <span>• Operative: {log.submitter}</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '1rem' }}>
                <button className="btn-ghost sm" style={{ borderRadius: '8px' }} onClick={() => setModal({ type: 'view', log })}><Eye size={16} /> Artifact</button>
                {log.isOwn && log.status !== 'approved' && log.status !== 'completed' && (
                  <button className="btn-ghost sm" style={{ borderRadius: '8px', color: 'var(--color-primary)' }} onClick={() => setModal({ type: 'edit', log })}><Edit2 size={16} /> Modify</button>
                )}
                {log.isOwn && (log.status === 'draft' || log.status === 'needs_revision') && (
                  <button style={{ color: 'var(--color-error)' }} className="btn-icon sm" onClick={() => setModal({ type: 'delete', log })}><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="fab" onClick={() => setModal({ type: 'add' })} title="Artifact Deployment"><PlusCircle size={24} /></button>

        {/* MODAL DISPATCHER */}
        {activeModal === 'add' && <LogFormModal teams={teams} role={role} user={freshUser} onClose={() => setModal(null)} onSave={saveLog} />}
        {activeModal === 'edit' && currentLog && <LogFormModal initial={currentLog} teams={teams} role={role} user={freshUser} onClose={() => setModal(null)} onSave={saveLog} />}
        {activeModal === 'view' && currentLog && <ViewModal log={currentLog} onClose={() => setModal(null)} />}
        {activeModal === 'reject' && currentLog && <RejectModal log={currentLog} onClose={() => setModal(null)} onReject={reviewAction} />}
        {activeModal === 'delete' && currentLog && <ConfirmDelete log={currentLog} onClose={() => setModal(null)} onConfirm={deleteLog} />}
      </div>
    </>
  );
};

export default Logs;
