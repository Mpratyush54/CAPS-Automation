import { useState } from 'react';
import {
  PlusCircle, Search, Edit2, Trash2, Clock, CheckCircle,
  Eye, X, Save, XCircle, AlertCircle, Info, Send,
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { WING_OPTIONS, COMMITTEE_OPTIONS } from '../data/orgOptions';

const STATUS_META = {
  'Draft': { label: 'Draft', badge: 'badge-neutral', desc: 'Not yet submitted' },
  'In Progress': { label: 'In Progress', badge: 'badge-warning', desc: 'Activity ongoing' },
  'Pending Review': { label: 'Pending Review', badge: 'badge-primary', desc: 'Awaiting Team Lead approval' },
  'Needs Revision': { label: 'Needs Revision', badge: 'badge-error', desc: 'Rejected, please update and resubmit' },
  'Completed': { label: 'Completed', badge: 'badge-success', desc: 'Approved by Team Lead' },
};

const SEED_MY = [
  { id: 1, submitter: 'Me', title: 'Sprint Planning Review', date: '2026-03-26', duration: '2h 30m', hours: '2', minutes: '30', tag: 'Planning', wing: 'Tech Wing', committee: 'Dev Board', status: 'Completed', isOwn: true, tlComment: 'Great work! Well documented.' },
  { id: 2, submitter: 'Me', title: 'Documentation Update', date: '2026-03-25', duration: '1h 00m', hours: '1', minutes: '0', tag: 'Docs', wing: 'Tech Wing', committee: 'Dev Board', status: 'Pending Review', isOwn: true, tlComment: null },
  { id: 3, submitter: 'Me', title: 'Team Sync Call', date: '2026-03-24', duration: '0h 45m', hours: '0', minutes: '45', tag: 'Meeting', wing: 'Tech Wing', committee: 'Dev Board', status: 'Needs Revision', isOwn: true, tlComment: 'Please add the agenda items and outcomes discussed.' },
  { id: 4, submitter: 'Me', title: 'DB Schema Review', date: '2026-03-23', duration: '1h 15m', hours: '1', minutes: '15', tag: 'Development', wing: 'Tech Wing', committee: 'Dev Board', status: 'Draft', isOwn: true, tlComment: null },
];

const SEED_TEAM = [
  { id: 10, submitter: 'Priya Nair', title: 'API Integration', date: '2026-03-26', duration: '3h 00m', hours: '3', minutes: '0', tag: 'Development', wing: 'Tech Wing', committee: 'Dev Board', status: 'Pending Review', isOwn: false, tlComment: null },
  { id: 11, submitter: 'Rahul Sharma', title: 'Unit Tests', date: '2026-03-26', duration: '1h 45m', hours: '1', minutes: '45', tag: 'Testing', wing: 'Tech Wing', committee: 'Dev Board', status: 'Pending Review', isOwn: false, tlComment: null },
  { id: 12, submitter: 'Carlos V.', title: 'DB Migration', date: '2026-03-25', duration: '2h 00m', hours: '2', minutes: '0', tag: 'Infra', wing: 'Tech Wing', committee: 'Infra Team', status: 'In Progress', isOwn: false, tlComment: null },
  { id: 13, submitter: 'Sam Lee', title: 'Code Review Session', date: '2026-03-25', duration: '1h 00m', hours: '1', minutes: '0', tag: 'Review', wing: 'Tech Wing', committee: 'Dev Board', status: 'Completed', isOwn: false, tlComment: 'Approved.' },
  { id: 14, submitter: 'Riya Gupta', title: 'Frontend Bug Fixes', date: '2026-03-24', duration: '2h 30m', hours: '2', minutes: '30', tag: 'Development', wing: 'Tech Wing', committee: 'Dev Board', status: 'Needs Revision', isOwn: false, tlComment: 'Screenshots required as evidence.' },
];

const SEED_OTHER = [
  { id: 20, submitter: 'Morgan Chen', title: 'Event Planning Meeting', date: '2026-03-26', duration: '2h 00m', hours: '2', minutes: '0', tag: 'Planning', wing: 'Community Wing', committee: 'Events Comm.', status: 'Pending Review', isOwn: false, tlComment: null },
  { id: 21, submitter: 'Divya S.', title: 'Outreach Campaign', date: '2026-03-25', duration: '3h 30m', hours: '3', minutes: '30', tag: 'Outreach', wing: 'Community Wing', committee: 'Outreach Team', status: 'Completed', isOwn: false, tlComment: 'Excellent outreach numbers.' },
];

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

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.Draft;
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
};

const LogFormModal = ({ initial, onClose, onSave, currentUser, role }) => {
  const isEdit = !!initial;
  const canChooseLabels = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const [form, setForm] = useState({
    title: initial?.title || '',
    date: initial?.date || '',
    hours: initial?.hours || '',
    minutes: initial?.minutes || '',
    wing: initial?.wing || currentUser?.wing || '',
    committee: initial?.committee || currentUser?.committee || '',
    status: initial?.status || 'Draft',
    notes: initial?.notes || '',
  });

  const canSubmitForReview = initial?.status !== 'Completed';
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = (nextStatus = 'Draft') => {
    const finalStatus = nextStatus;
    onSave({
      ...initial,
      ...form,
      wing: canChooseLabels ? form.wing : (initial?.wing || currentUser?.wing || ''),
      committee: canChooseLabels ? form.committee : (initial?.committee || currentUser?.committee || ''),
      status: finalStatus,
      duration: `${form.hours || 0}h ${form.minutes || 0}m`,
      tlComment: nextStatus === 'Pending Review' ? null : initial?.tlComment,
    });
    onClose();
  };

  return (
    <Modal title={isEdit ? 'Edit Log' : 'Add Work Log'} onClose={onClose}>
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <div><label className="input-label">Activity Title *</label><input className="input-field" placeholder="What did you work on?" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div><label className="input-label">Date *</label><input className="input-field" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div><label className="input-label">Hours</label><input className="input-field" type="number" min="0" max="24" placeholder="0" value={form.hours} onChange={(e) => set('hours', e.target.value)} /></div>
          <div><label className="input-label">Minutes</label><input className="input-field" type="number" min="0" max="59" placeholder="0" value={form.minutes} onChange={(e) => set('minutes', e.target.value)} /></div>
        </div>

        {canChooseLabels ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Wing</label>
              <select className="input-field" value={form.wing} onChange={(e) => set('wing', e.target.value)}>
                <option value="">Select wing</option>
                {WING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Committee</label>
              <select className="input-field" value={form.committee} onChange={(e) => set('committee', e.target.value)}>
                <option value="">Select committee</option>
                {COMMITTEE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        ) : null}
        <div>
          <label className="input-label">Notes / Description</label>
          <textarea className="input-field" rows={3} placeholder="Add context or notes for your Team Lead..." value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
        </div>

        {initial?.tlComment && (
          <div style={{ padding: '0.75rem', background: 'var(--color-error-container)', borderRadius: '0.5rem', borderLeft: '3px solid var(--color-error)' }}>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-error-container)' }}>TEAM LEAD FEEDBACK</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-error-container)' }}>{initial.tlComment}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        <button type="button" className="btn-secondary" onClick={() => handleSave('Draft')} style={{ flex: 1, justifyContent: 'center' }}><Save size={14} /> Save Draft</button>
        {canSubmitForReview && <button type="button" className="btn-primary" onClick={() => handleSave('Pending Review')} style={{ flex: 1.2, justifyContent: 'center' }}><Send size={14} /> Submit for Review</button>}
      </div>
    </Modal>
  );
};

const ViewModal = ({ log, onClose }) => (
  <Modal title="Log Details" onClose={onClose}>
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ padding: '1rem', background: 'var(--color-surface-low)', borderRadius: '0.75rem' }}>
        <h3 style={{ margin: '0 0 0.625rem', fontSize: '1.0625rem', fontWeight: 700 }}>{log.title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={log.status} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        {[
          { label: 'Submitted By', value: log.submitter },
          { label: 'Date', value: log.date },
          { label: 'Duration', value: log.duration },
          { label: 'Wing', value: log.wing || '-' },
          { label: 'Committee', value: log.committee || '-' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>
      {log.tlComment && (
        <div style={{ padding: '0.875rem', borderRadius: '0.625rem', background: 'var(--color-surface-low)' }}>
          <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>TL NOTE</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{log.tlComment}</p>
        </div>
      )}
    </div>
  </Modal>
);

const ApproveModal = ({ log, onClose, onApprove }) => (
  <Modal title="Approve Log" onClose={onClose} maxWidth="400px">
    <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Approve <strong style={{ color: 'var(--color-on-surface)' }}>'{log.title}'</strong>?</p>
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      <button className="btn-primary" onClick={() => { onApprove(log.id, 'Completed', 'Approved.'); onClose(); }} style={{ flex: 1, justifyContent: 'center' }}><CheckCircle size={14} /> Approve</button>
    </div>
  </Modal>
);

const RejectModal = ({ log, onClose, onReject }) => {
  const [comment, setComment] = useState('');
  return (
    <Modal title="Request Revision" onClose={onClose} maxWidth="460px">
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Add feedback for <strong style={{ color: 'var(--color-on-surface)' }}>'{log.title}'</strong>.</p>
        <textarea className="input-field" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explain what needs to be fixed..." style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
        <button className="btn-primary" onClick={() => { onReject(log.id, 'Needs Revision', comment || 'Please revise and resubmit.'); onClose(); }} style={{ flex: 1, justifyContent: 'center' }}><XCircle size={14} /> Send Back</button>
      </div>
    </Modal>
  );
};

const ConfirmDelete = ({ log, onConfirm, onClose }) => (
  <Modal title="Delete Log" onClose={onClose} maxWidth="400px">
    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1.5rem' }}>Delete <strong style={{ color: 'var(--color-on-surface)' }}>'{log.title}'</strong>? This action cannot be undone.</p>
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
      <button onClick={() => { onConfirm(); onClose(); }} style={{ flex: 1, padding: '0.5rem 1rem', background: 'var(--color-error)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
    </div>
  </Modal>
);

const Logs = () => {
  const { role, user } = useAuthStore();
  const [myLogs, setMyLogs] = useState(SEED_MY);
  const [teamLogs, setTeamLogs] = useState(SEED_TEAM);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [addModal, setAdd] = useState(false);
  const [editModal, setEdit] = useState(null);
  const [viewModal, setView] = useState(null);
  const [deleteModal, setDel] = useState(null);
  const [approveModal, setApprove] = useState(null);
  const [rejectModal, setReject] = useState(null);

  const baseData = (() => {
    if (role === ROLES.VOLUNTEER) return myLogs;
    if (role === ROLES.TEAM_LEAD) return [...teamLogs, ...myLogs];
    return [...myLogs, ...teamLogs, ...SEED_OTHER];
  })();

  const filterOptions = ['All', 'Draft', 'In Progress', 'Pending Review', 'Needs Revision', 'Completed'];
  const pending = baseData.filter((l) => l.status === 'Pending Review').length;
  const filtered = baseData.filter((l) => {
    const matchF = filter === 'All' || l.status === filter;
    const matchS = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.submitter.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const addLog = (data) => setMyLogs((ls) => [{ id: Date.now(), submitter: 'Me', isOwn: true, tlComment: null, ...data }, ...ls]);
  const saveLog = (data) => setMyLogs((ls) => ls.map((l) => l.id === data.id ? { ...data, tlComment: data.status === 'Pending Review' ? null : data.tlComment } : l));
  const deleteLog = () => setMyLogs((ls) => ls.filter((l) => l.id !== deleteModal.id));
  const reviewAction = (id, newStatus, comment) => {
    const updateList = (list) => list.map((l) => l.id === id ? { ...l, status: newStatus, tlComment: comment } : l);
    setTeamLogs(updateList);
    setMyLogs(updateList);
  };

  const scopeLabel = role === ROLES.VOLUNTEER ? 'My Work Logs' : role === ROLES.TEAM_LEAD ? 'Team Logs' : role === ROLES.ADMIN ? 'Team Label Logs' : 'All Logs';
  const needsRevisionLogs = myLogs.filter((l) => l.status === 'Needs Revision');

  return (
    <>
      <TopBar title={scopeLabel} />
      <div className="page-body">
        {role === ROLES.VOLUNTEER && needsRevisionLogs.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.875rem 1rem', background: 'var(--color-error-container)', borderRadius: '0.625rem', marginBottom: '1rem', borderLeft: '4px solid var(--color-error)' }}>
            <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-error-container)' }}>{needsRevisionLogs.length} log{needsRevisionLogs.length > 1 ? 's' : ''} need{needsRevisionLogs.length === 1 ? 's' : ''} your attention</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-error-container)' }}>Your Team Lead has requested revisions. Edit the flagged logs and resubmit for review.</p>
            </div>
          </div>
        )}

        {role === ROLES.TEAM_LEAD && pending > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--color-secondary-fixed)', borderRadius: '0.625rem', marginBottom: '1rem', borderLeft: '4px solid #674db0' }}>
            <Clock size={17} style={{ color: '#674db0', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#4e3397', fontWeight: 600 }}>{pending} log{pending > 1 ? 's' : ''} pending your review <button onClick={() => setFilter('Pending Review')} style={{ background: 'none', border: 'none', padding: 0, color: '#674db0', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.5rem' }}>Review now</button></p>
          </div>
        )}

        {role === ROLES.VOLUNTEER && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.625rem 0.875rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            <Info size={13} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
            <span>Workflow: <strong>Draft to In Progress to Submit for Review to Team Lead approval to Completed</strong></span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
            <input placeholder={role === ROLES.VOLUNTEER ? 'Search my logs...' : 'Search logs or member...'} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {filterOptions.map((f) => (
              <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)} style={{ position: 'relative' }}>
                {f}
                {f === 'Pending Review' && pending > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', width: '16px', height: '16px', background: 'var(--color-error)', color: '#fff', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-background)' }}>{pending}</span>}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setAdd(true)}><PlusCircle size={15} /> Add Log</button>
        </div>

        <div className="stat-scroll-row" style={{ marginBottom: '1.25rem' }}>
          {['Draft', 'In Progress', 'Pending Review', 'Needs Revision', 'Completed'].map((s) => {
            const meta = STATUS_META[s];
            const count = baseData.filter((l) => l.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(filter === s ? 'All' : s)} className="card" style={{ padding: '0.75rem 1rem', cursor: 'pointer', border: filter === s ? '2px solid var(--color-primary)' : '2px solid transparent', textAlign: 'left', minWidth: '5rem' }}>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{count}</p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>{meta.label}</p>
              </button>
            );
          })}
        </div>

        <div className="desktop-log-table card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                {role !== ROLES.VOLUNTEER && <th>Member</th>}
                <th>Activity</th>
                <th>Date</th>
                <th>Duration</th>
                {role !== ROLES.VOLUNTEER && <th>Committee</th>}
                <th>Status</th>
                {role === ROLES.TEAM_LEAD && <th>TL Note</th>}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-on-surface-variant)' }}>No logs for '{filter}'{search ? ` matching '${search}'` : ''}.</td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} style={{ background: log.status === 'Needs Revision' && log.isOwn ? 'var(--color-error-container)' : undefined, opacity: log.status === 'Needs Revision' && log.isOwn ? 0.92 : 1 }}>
                  {role !== ROLES.VOLUNTEER && <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div className="avatar" style={{ width: '1.625rem', height: '1.625rem', fontSize: '0.6rem', flexShrink: 0 }}>{log.submitter[0]}</div><span style={{ fontSize: '0.8125rem', fontWeight: log.isOwn ? 600 : 400 }}>{log.submitter}</span></div></td>}
                  <td><span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>{log.title}{log.status === 'Needs Revision' && log.isOwn && <AlertCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0 }} />}</span></td>
                  <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{log.date}</td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}><Clock size={12} style={{ color: 'var(--color-outline)' }} />{log.duration}</span></td>
                  {role !== ROLES.VOLUNTEER && <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{log.committee}</td>}
                  <td><StatusBadge status={log.status} /></td>
                  {role === ROLES.TEAM_LEAD && <td style={{ maxWidth: '160px' }}>{log.tlComment ? <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{log.tlComment}</span> : <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>-</span>}</td>}
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button title="View details" onClick={() => setView(log)} style={{ padding: '0.3rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Eye size={14} /></button>
                      {log.isOwn && log.status !== 'Completed' && <button title="Edit" onClick={() => setEdit(log)} style={{ padding: '0.3rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Edit2 size={14} /></button>}
                      {can(role, 'approveLog') && !log.isOwn && log.status === 'Pending Review' && <><button title="Approve" onClick={() => setApprove(log)} style={{ padding: '0.3rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><CheckCircle size={14} /></button><button title="Request Revision" onClick={() => setReject(log)} style={{ padding: '0.3rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><XCircle size={14} /></button></>}
                      {log.isOwn && (log.status === 'Draft' || log.status === 'Needs Revision') && <button title="Delete" onClick={() => setDel(log)} style={{ padding: '0.3rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', display: 'flex', alignItems: 'center', borderRadius: '0.375rem' }}><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-log-list">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-on-surface-variant)' }}>No logs for '{filter}'{search ? ` matching '${search}'` : ''}.</div>
          ) : filtered.map((log) => (
            <div key={log.id} className={`log-card${log.status === 'Needs Revision' && log.isOwn ? ' needs-revision' : ''}`}>
              <div className="log-card-title">{log.title}{log.status === 'Needs Revision' && log.isOwn && <AlertCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0 }} />}</div>
              <div className="log-card-meta"><span>{log.date}</span><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} />{log.duration}</span>{role !== ROLES.VOLUNTEER && <span style={{ fontWeight: 500 }}>{log.submitter}</span>}</div>
              <div className="log-card-footer">
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}><StatusBadge status={log.status} /></div>
                <div className="log-card-actions">
                  <button title="View" onClick={() => setView(log)} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)', borderRadius: '0.375rem' }}><Eye size={15} /></button>
                  {log.isOwn && log.status !== 'Completed' && <button title="Edit" onClick={() => setEdit(log)} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', borderRadius: '0.375rem' }}><Edit2 size={15} /></button>}
                  {can(role, 'approveLog') && !log.isOwn && log.status === 'Pending Review' && <><button title="Approve" onClick={() => setApprove(log)} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', borderRadius: '0.375rem' }}><CheckCircle size={15} /></button><button title="Reject" onClick={() => setReject(log)} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', borderRadius: '0.375rem' }}><XCircle size={15} /></button></>}
                  {log.isOwn && (log.status === 'Draft' || log.status === 'Needs Revision') && <button title="Delete" onClick={() => setDel(log)} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', borderRadius: '0.375rem' }}><Trash2 size={15} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="fab" onClick={() => setAdd(true)} title="Add Log" aria-label="Add Log"><PlusCircle size={22} /></button>

        {addModal && <LogFormModal onClose={() => setAdd(false)} onSave={addLog} currentUser={user} role={role} />}
        {editModal && <LogFormModal initial={editModal} onClose={() => setEdit(null)} onSave={saveLog} currentUser={user} role={role} />}
        {viewModal && <ViewModal log={viewModal} onClose={() => setView(null)} />}
        {deleteModal && <ConfirmDelete log={deleteModal} onConfirm={deleteLog} onClose={() => setDel(null)} />}
        {approveModal && <ApproveModal log={approveModal} onClose={() => setApprove(null)} onApprove={reviewAction} />}
        {rejectModal && <RejectModal log={rejectModal} onClose={() => setReject(null)} onReject={reviewAction} />}
      </div>
    </>
  );
};

export default Logs;

