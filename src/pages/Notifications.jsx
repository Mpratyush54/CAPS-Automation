import { useState } from 'react';
import { Bell, BellOff, Send, CheckCheck, Info, AlertTriangle, Calendar, Check, X, ChevronRight, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';

const SEED = [
  { id: 1, type: 'info',    title: 'Q1 Review Board scheduled',    body: 'The Q1 Review Board meeting is confirmed for Apr 2, 2026 at 2:00 PM in Conf Room A. All wing leads are requested to prepare their quarterly summaries and attendance is compulsory.',        time: '2m ago',   fullTime: 'Mar 26, 2026 · 2:28 PM',  read: false, from: 'Jordan Smith', role: 'Super Admin', audience: 'All Members' },
  { id: 2, type: 'event',   title: 'Volunteer Drive reminder',      body: 'The Annual Volunteer Drive starts in 2 days on Mar 28, 2026 at City Hall. Coordinators please ensure all logistics are in place. Volunteer briefing kits are available in the shared drive.',   time: '18m ago',  fullTime: 'Mar 26, 2026 · 2:10 PM',  read: false, from: 'Morgan Chen', role: 'Admin',       audience: 'Community Wing' },
  { id: 3, type: 'success', title: 'Log approved',                  body: 'Your work log "Sprint Planning Review" (2h 30m) submitted on Mar 26, 2026 has been reviewed and approved by your Team Lead. Keep up the great work! It\'s been logged under the Dev Board committee.',  time: '1h ago',   fullTime: 'Mar 26, 2026 · 1:30 PM',  read: true,  from: 'Sam Lee',     role: 'Team Lead',   audience: 'You' },
  { id: 4, type: 'warning', title: 'Pending log submission',        body: 'You have 3 work logs pending from the week of Mar 17–21, 2026. The submission deadline is Mar 27 at midnight. Please log into the portal and submit your logs to avoid a compliance flag.',      time: '3h ago',   fullTime: 'Mar 26, 2026 · 11:00 AM', read: true,  from: 'System',      role: 'System',      audience: 'You' },
  { id: 5, type: 'info',    title: 'New committee member added',    body: 'Rahul Sharma (rahul@worklog.io) has been onboarded to the Dev Board committee under Tech Wing, effective Mar 25, 2026. Role: Volunteer. Please ensure he receives the welcome package and task orientation.',  time: 'Yesterday', fullTime: 'Mar 25, 2026 · 4:15 PM', read: true,  from: 'Alex Rivera', role: 'Team Lead',   audience: 'Dev Board' },
  { id: 6, type: 'event',   title: 'Tech Workshop confirmed',       body: 'The Tech Workshop Series: AI session is confirmed for Apr 5, 2026 at 10:00 AM in Auditorium B. 68 registrations received. All coordinators please arrive 30 minutes early for setup.',              time: 'Yesterday', fullTime: 'Mar 25, 2026 · 2:00 PM', read: true,  from: 'Alex Rivera', role: 'Team Lead',   audience: 'Tech Wing' },
];

const typeIcon  = { info: Info, event: Calendar, success: Check, warning: AlertTriangle };
const typeStyle = {
  info:    { bg: 'var(--color-primary-fixed)',   color: 'var(--color-primary)', label: 'Info' },
  event:   { bg: 'var(--color-secondary-fixed)', color: '#4e3397',              label: 'Event' },
  success: { bg: '#d1fae5',                      color: '#059669',              label: 'Success' },
  warning: { bg: '#fef3c7',                      color: '#d97706',              label: 'Warning' },
};

/* ── Modal shell ─────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, maxWidth = '520px' }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ maxWidth }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', padding: '0.25rem', borderRadius: '0.375rem' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

/* ── Notification Detail Modal ───────────────────────────────── */
const DetailModal = ({ notification: n, onClose, onMarkRead }) => {
  const Icon  = typeIcon[n.type] || Info;
  const style = typeStyle[n.type] || typeStyle.info;

  return (
    <Modal title="Notification" onClose={onClose} maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header strip */}
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '1rem', background: style.bg, borderRadius: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color: style.color }} />
          </div>
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: style.color }}>{style.label}</span>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.0625rem', fontWeight: 700 }}>{n.title}</h3>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-surface-low)', borderRadius: '0.625rem', fontSize: '0.875rem', color: 'var(--color-on-surface)', lineHeight: 1.75 }}>
          {n.body}
        </div>

        {/* Meta */}
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: 'From',     value: `${n.from} (${n.role})` },
            { label: 'Sent to', value: n.audience },
            { label: 'Time',    value: n.fullTime },
            { label: 'Status',  value: n.read ? 'Read' : 'Unread' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card-action-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
        {!n.read && (
          <button className="btn-ghost" onClick={() => { onMarkRead(n.id); onClose(); }}>
            <Check size={14} /> Mark as read
          </button>
        )}
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

/* ── Send Modal ──────────────────────────────────────────────── */
const SendModal = ({ onClose, role, currentUser }) => {
  const [form, setForm] = useState({ title: '', body: '', priority: 'Normal', type: 'info' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const audienceOptions = role === ROLES.TEAM_LEAD
    ? [
        currentUser?.committee ? `${currentUser.committee} (all members)` : 'Committee Members',
        'Specific Member',
      ]
    : role === ROLES.ADMIN
    ? [
        currentUser?.wing ? `Entire ${currentUser.wing}` : 'Entire Wing',
        'Selected Committee',
        'All Admins',
      ]
    : ['Entire Organization', 'Selected Wing', 'Selected Committee', 'Specific Role'];

  const [audience, setAudience] = useState(audienceOptions[0]);

  const scopeLabel = role === ROLES.TEAM_LEAD
    ? `${currentUser?.wing || 'Wing'} · ${currentUser?.committee || 'Committee'}`
    : role === ROLES.ADMIN ? currentUser?.wing || 'Your Wing'
    : 'Organization-wide';

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <Modal title="Send Notification" onClose={onClose} maxWidth="560px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--color-primary-fixed)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600 }}>
        <Send size={12} style={{ flexShrink: 0 }} />
        Sending as: <strong style={{ margin: '0 0.25rem' }}>{currentUser?.name || 'You'}</strong> ({role}) &nbsp;&middot;&nbsp; Scope: {scopeLabel}
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Audience *</label>
              <select className="input-field" value={audience} onChange={e => setAudience(e.target.value)} style={{ cursor: 'pointer' }}>
                {audienceOptions.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Type</label>
              <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)} style={{ cursor: 'pointer' }}>
                {['info', 'event', 'warning'].map(t => <option key={t} value={t}>{typeStyle[t]?.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="input-label">Title *</label><input className="input-field" placeholder="Notification title" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
          <div>
            <label className="input-label">Message *</label>
            <textarea className="input-field" placeholder="Write your message…" value={form.body} onChange={e => set('body', e.target.value)} rows={5} required style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="input-label">Priority</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Normal', 'High', 'Urgent'].map(p => (
                <button key={p} type="button"
                  className={`chip${form.priority === p ? ' active' : ''}`}
                  onClick={() => set('priority', p)} style={{ flex: 1, justifyContent: 'center' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Send size={14} /> Send Notification</button>
        </div>
      </form>
    </Modal>
  );
};

/* ── Notifications Page ──────────────────────────────────────── */
const Notifications = () => {
  const { role, user } = useAuthStore();
  const [notifications, setNotifications] = useState(SEED);
  const [filter, setFilter]  = useState('All');
  const [detail, setDetail]  = useState(null);
  const [sendModal, setSend] = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n =>
    filter === 'All' ? true : filter === 'Unread' ? !n.read : n.read
  );

  const markRead = (id) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const markAll  = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));

  const openDetail = (n) => {
    if (!n.read) markRead(n.id);
    setDetail(n);
  };

  const canSend = can(role, 'sendToCommittee');

  return (
    <>
      <TopBar title="Notifications" />
      <div className="page-body">
        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {['All', 'Unread', 'Read'].map(f => (
              <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f}{f === 'Unread' && unread > 0 ? ` (${unread})` : ''}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {unread > 0 && <button className="btn-secondary" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
            {canSend
              ? <button className="btn-primary" onClick={() => setSend(true)}><Send size={14} /> Send</button>
              : <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Bell size={14} /> Receive only</div>
            }
          </div>
        </div>

        {/* Role info */}
        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: role === ROLES.VOLUNTEER ? 'var(--color-surface-low)' : role === ROLES.TEAM_LEAD ? 'var(--color-secondary-fixed)' : 'var(--color-primary-fixed)',
          color: role === ROLES.VOLUNTEER ? 'var(--color-on-surface-variant)' : role === ROLES.TEAM_LEAD ? '#4e3397' : 'var(--color-primary)'
        }}>
          {role === ROLES.VOLUNTEER && <><Info size={14} style={{ flexShrink: 0 }} /> You can view and receive notifications. Only Team Leads and above can send them.</>}
          {role === ROLES.TEAM_LEAD && <><Send size={14} style={{ flexShrink: 0 }} /> You can send to your committee: <strong style={{ marginLeft: '0.25rem' }}>{user?.wing} · {user?.committee}</strong></>}
          {role === ROLES.ADMIN && <><Bell size={14} style={{ flexShrink: 0 }} /> You can send notifications across your wing: <strong style={{ marginLeft: '0.25rem' }}>{user?.wing}</strong></>}
          {role === ROLES.SUPER_ADMIN && <><Bell size={14} style={{ flexShrink: 0 }} /> Global privileges — send to the whole organization or any group.</>}
        </div>

        {/* Notification list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', color: 'var(--color-on-surface-variant)' }}>
              <BellOff size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No notifications</p>
            </div>
          ) : filtered.map((n, i) => {
            const Icon  = typeIcon[n.type] || Info;
            const style = typeStyle[n.type] || typeStyle.info;
            return (
              <div
                key={n.id}
                onClick={() => openDetail(n)}
                style={{
                  display: 'flex', gap: '0.875rem', padding: '0.875rem 1rem', cursor: 'pointer',
                  borderLeft: !n.read ? '3px solid var(--color-primary)' : '3px solid transparent',
                  background: !n.read ? 'var(--color-primary-fixed)' : 'transparent',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--color-surface-low)' : undefined,
                  transition: 'background 0.1s',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} style={{ color: style.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: n.read ? 500 : 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{n.time}</span>
                      {!n.read && <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: 'var(--color-primary)' }} />}
                    </div>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.375rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{n.body}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="avatar" style={{ width: '1.25rem', height: '1.25rem', fontSize: '0.5rem', flexShrink: 0 }}>{n.from.charAt(0)}</div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>
                      {n.from} · {n.role}
                      {n.audience !== 'You' && <> · <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>to {n.audience}</span></>}
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {detail   && <DetailModal notification={detail} onClose={() => setDetail(null)} onMarkRead={markRead} />}
        {sendModal && <SendModal onClose={() => setSend(false)} role={role} currentUser={user} />}
      </div>
    </>
  );
};

export default Notifications;
