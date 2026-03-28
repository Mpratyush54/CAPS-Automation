import { useEffect, useState } from 'react';
import { Bell, BellOff, Send, CheckCheck, Info, AlertTriangle, Calendar, Check, X, ChevronRight } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeNotification } from '../lib/adapters';

const SEED = [
  { id: 1, type: 'warning', title: 'Weekly report missing', body: 'Outreach Team has not submitted the weekly report for 2026-W12. Admin and Super Admin escalation has been scheduled because the deadline passed.', time: 'Just now', fullTime: 'Mar 29, 2026 - 09:10 AM', read: false, from: 'System', role: 'System', audience: 'Outreach Team, Community Wing Admins' },
  { id: 2, type: 'warning', title: 'Event photo sync pending', body: 'Two photos uploaded for Annual Volunteer Drive are still pending Google Drive sync. The event report will remain open until sync succeeds.', time: '14m ago', fullTime: 'Mar 29, 2026 - 08:56 AM', read: false, from: 'Media Sync Worker', role: 'System', audience: 'Event Owner, Admin, Super Admin' },
  { id: 3, type: 'success', title: 'Yearly report generated', body: 'The FY 2025-26 annual report for Health Comm. has been generated from approved weekly and monthly records and is ready for review.', time: '35m ago', fullTime: 'Mar 29, 2026 - 08:35 AM', read: false, from: 'Report Engine', role: 'System', audience: 'Team Lead, Admin, Super Admin' },
  { id: 4, type: 'event', title: 'Volunteer Drive reminder', body: 'The Annual Volunteer Drive starts in 2 days on Mar 28, 2026 at City Hall. Coordinators please ensure all logistics are in place.', time: '1h ago', fullTime: 'Mar 29, 2026 - 08:00 AM', read: true, from: 'Morgan Chen', role: 'Admin', audience: 'Community Wing' },
  { id: 5, type: 'success', title: 'Log approved', body: 'Your work log "Sprint Planning Review" was reviewed and approved by your Team Lead for the Dev Board / Tech Wing team labels.', time: '2h ago', fullTime: 'Mar 29, 2026 - 07:02 AM', read: true, from: 'Sam Lee', role: 'Team Lead', audience: 'You' },
  { id: 6, type: 'info', title: 'New team member added', body: 'Rahul Sharma has been onboarded with the Dev Board / Tech Wing team labels effective Mar 25, 2026.', time: 'Yesterday', fullTime: 'Mar 28, 2026 - 04:15 PM', read: true, from: 'Alex Rivera', role: 'Team Lead', audience: 'Dev Board' },
];

const typeIcon = { info: Info, event: Calendar, success: Check, warning: AlertTriangle };
const typeStyle = {
  info: { bg: 'var(--color-primary-fixed)', color: 'var(--color-primary)', label: 'Info' },
  event: { bg: 'var(--color-secondary-fixed)', color: '#4e3397', label: 'Event' },
  success: { bg: '#d1fae5', color: '#059669', label: 'Success' },
  warning: { bg: '#fef3c7', color: '#d97706', label: 'Warning' },
};

const Modal = ({ title, onClose, children, maxWidth = '560px' }) => (
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

const DetailModal = ({ notification, onClose, onMarkRead }) => {
  const Icon = typeIcon[notification.type] || Info;
  const style = typeStyle[notification.type] || typeStyle.info;

  return (
    <Modal title="Notification" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', padding: '1rem', background: style.bg, borderRadius: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color: style.color }} />
          </div>
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: style.color }}>{style.label}</span>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.0625rem', fontWeight: 700 }}>{notification.title}</h3>
          </div>
        </div>
        <div style={{ padding: '0.875rem 1rem', background: 'var(--color-surface-low)', borderRadius: '0.625rem', fontSize: '0.875rem', color: 'var(--color-on-surface)', lineHeight: 1.75 }}>{notification.body}</div>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[{ label: 'From', value: `${notification.from} (${notification.role})` }, { label: 'Sent to', value: notification.audience }, { label: 'Time', value: notification.fullTime }, { label: 'Status', value: notification.read ? 'Read' : 'Unread' }].map(({ label, value }) => (
            <div key={label}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card-action-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
        {!notification.read && <button className="btn-ghost" onClick={() => { onMarkRead(notification.id); onClose(); }}><Check size={14} /> Mark as read</button>}
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

const SendModal = ({ onClose, role, currentUser, onError, onSent }) => {
  const [form, setForm] = useState({ title: '', body: '', type: 'info' });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const audienceOptions = role === ROLES.TEAM_LEAD ? [currentUser?.committee ? `${currentUser.committee} (team members)` : 'Team Members', 'Specific Member'] : role === ROLES.ADMIN ? [currentUser?.wing ? `Entire ${currentUser.wing}` : 'Entire Label 1 Group', 'Selected Label 2 Group', 'All Admins'] : ['Entire Organization', 'Selected Label 1 Group', 'Selected Label 2 Group', 'Specific Role'];
  const [audience, setAudience] = useState(audienceOptions[0]);
  const scopeLabel = role === ROLES.TEAM_LEAD ? `${currentUser?.wing || 'Label 1'} / ${currentUser?.committee || 'Label 2'}` : role === ROLES.ADMIN ? currentUser?.wing || 'Your Label 1 Group' : 'Organization-wide';
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    onError?.(null);
    try {
      await api.post('/api/notifications', {
        type: form.type,
        title: form.title,
        body: form.body,
        audienceType: audience.toLowerCase().includes('organization')
          ? 'global'
          : audience.toLowerCase().includes('role')
          ? 'specific_role'
          : audience.toLowerCase().includes('member')
          ? 'specific_member'
          : role === ROLES.TEAM_LEAD
          ? 'committee'
          : 'wing',
      });
      onSent?.({
        id: `temp-${Date.now()}`,
        type: form.type,
        title: form.title,
        body: form.body,
        time: 'Just now',
        fullTime: new Date().toLocaleString(),
        read: true,
        from: currentUser?.name || 'You',
        role,
        audience,
      });
      onClose();
    } catch (sendError) {
      onError?.(getErrorMessage(sendError, 'Unable to send notification.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Send Notification" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--color-primary-fixed)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600 }}>
        <Send size={12} style={{ flexShrink: 0 }} />
        Sending as: <strong style={{ margin: '0 0.25rem' }}>{currentUser?.name || 'You'}</strong> ({role}) - Scope: {scopeLabel}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.875rem' }}>
        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div><label className="input-label">Audience *</label><select className="input-field" value={audience} onChange={(e) => setAudience(e.target.value)}>{audienceOptions.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="input-label">Type</label><select className="input-field" value={form.type} onChange={(e) => set('type', e.target.value)}>{['info', 'event', 'warning'].map((type) => <option key={type} value={type}>{typeStyle[type]?.label}</option>)}</select></div>
        </div>
        <div><label className="input-label">Title *</label><input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div><label className="input-label">Message *</label><textarea className="input-field" rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} required style={{ resize: 'vertical' }} /></div>
        <div className="card-action-row"><button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button><button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1, justifyContent: 'center' }}><Send size={14} /> {submitting ? 'Sending...' : 'Send Notification'}</button></div>
      </form>
    </Modal>
  );
};

const Notifications = () => {
  const { role, user } = useAuthStore();
  const [notifications, setNotifications] = useState(SEED);
  const [filter, setFilter] = useState('All');
  const [detail, setDetail] = useState(null);
  const [sendModal, setSend] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      try {
        const response = await api.get('/api/notifications', {
          params: { filter, page: 1, pageSize: 50 },
        });
        const payload = unwrap(response);
        const rows = payload?.rows || payload?.items || [];
        if (mounted && rows.length) {
          setNotifications(rows.map(normalizeNotification));
        }
      } catch {
        // Keep seeded notifications if the backend payload does not match yet.
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [filter]);

  const unread = notifications.filter((item) => !item.read).length;
  const filtered = notifications.filter((item) => filter === 'All' ? true : filter === 'Unread' ? !item.read : item.read);
  const markRead = async (id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    try {
      await api.patch(`/api/notifications/${id}/read`, { read: true });
    } catch {
      // Keep optimistic update.
    }
  };
  const markAll = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await api.patch('/api/notifications/read-all', {});
    } catch {
      // Keep optimistic update.
    }
  };
  const canSend = can(role, 'sendToCommittee');

  return (
    <>
      <TopBar title="Notifications" />
      <div className="page-body">
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{['All', 'Unread', 'Read'].map((item) => <button key={item} className={`chip${filter === item ? ' active' : ''}`} onClick={() => setFilter(item)}>{item}{item === 'Unread' && unread > 0 ? ` (${unread})` : ''}</button>)}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {unread > 0 && <button className="btn-secondary" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}
            {canSend ? <button className="btn-primary" onClick={() => setSend(true)}><Send size={14} /> Send</button> : <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}><Bell size={14} /> Receive only</div>}
          </div>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', fontSize: '0.8125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: role === ROLES.VOLUNTEER ? 'var(--color-surface-low)' : role === ROLES.TEAM_LEAD ? 'var(--color-secondary-fixed)' : 'var(--color-primary-fixed)', color: role === ROLES.VOLUNTEER ? 'var(--color-on-surface-variant)' : role === ROLES.TEAM_LEAD ? '#4e3397' : 'var(--color-primary)' }}>
          {role === ROLES.VOLUNTEER && <><Info size={14} style={{ flexShrink: 0 }} /> Notifications is where you receive report reminders, event updates, and media sync alerts relevant to you.</>}
          {role === ROLES.TEAM_LEAD && <><Send size={14} style={{ flexShrink: 0 }} /> Notifications is the single inbox for missed reports, event report updates, photo sync issues, and team messages for <strong style={{ marginLeft: '0.25rem' }}>{user?.wing} / {user?.committee}</strong></>}
          {role === ROLES.ADMIN && <><Bell size={14} style={{ flexShrink: 0 }} /> Notifications collects label-group alerts, missing team reports, upload failures, and report generation updates for <strong style={{ marginLeft: '0.25rem' }}>{user?.wing}</strong></>}
          {role === ROLES.SUPER_ADMIN && <><Bell size={14} style={{ flexShrink: 0 }} /> Global inbox for escalations, annual reports, media sync failures, and organization-wide messaging.</>}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', color: 'var(--color-on-surface-variant)' }}><BellOff size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} /><p style={{ margin: 0, fontWeight: 500 }}>No notifications</p></div>
          ) : filtered.map((item, index) => {
            const Icon = typeIcon[item.type] || Info;
            const style = typeStyle[item.type] || typeStyle.info;
            return (
              <div key={item.id} onClick={() => { if (!item.read) markRead(item.id); setDetail(item); }} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1rem', cursor: 'pointer', borderLeft: !item.read ? '3px solid var(--color-primary)' : '3px solid transparent', background: !item.read ? 'var(--color-primary-fixed)' : 'transparent', borderBottom: index < filtered.length - 1 ? '1px solid var(--color-surface-low)' : undefined, alignItems: 'center' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={15} style={{ color: style.color }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ margin: 0, fontWeight: item.read ? 500 : 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}><span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{item.time}</span>{!item.read && <span style={{ width: '7px', height: '7px', borderRadius: '9999px', background: 'var(--color-primary)' }} />}</div>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.375rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{item.body}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="avatar" style={{ width: '1.25rem', height: '1.25rem', fontSize: '0.5rem', flexShrink: 0 }}>{item.from.charAt(0)}</div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{item.from} - {item.role}{item.audience !== 'You' && <> - <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>to {item.audience}</span></>}</span>
                  </div>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>

        {detail && <DetailModal notification={detail} onClose={() => setDetail(null)} onMarkRead={markRead} />}
        {sendModal && <SendModal onClose={() => setSend(false)} role={role} currentUser={user} onError={setError} onSent={(item) => setNotifications((current) => [item, ...current])} />}
      </div>
    </>
  );
};

export default Notifications;
