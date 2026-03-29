import { useEffect, useState } from 'react';
import { Bell, BellOff, Send, CheckCheck, Info, AlertTriangle, Calendar, Check, X, ChevronRight, Loader2 } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeNotification } from '../lib/adapters';

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
    <Modal title="Notification Details" onClose={onClose}>
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
          {[{ label: 'From', value: `${notification.from || 'System'} (${notification.role || 'System'})` }, { label: 'Time', value: notification.fullTime || notification.time }].map(({ label, value }) => (
            <div key={label}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card-action-row" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
        {!notification.read && <button className="btn-ghost" onClick={() => { onMarkRead(notification.id); onClose(); }}><Check size={14} /> Mark Read</button>}
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

const Notifications = () => {
  const { role, user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const params = { filter: filter === 'all' ? undefined : filter, page: 1, pageSize: 50 };
        const response = await api.get('/api/notifications', { params });
        const rows = unwrap(response).rows || [];
        if (mounted) {
          setNotifications(rows.map(normalizeNotification));
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load notifications.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadNotifications();
    return () => { mounted = false; };
  }, [filter]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = notifications.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : n.read);

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.patch(`/api/notifications/${id}/read`, { read: true });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.patch('/api/notifications/read-all', {});
    } catch {}
  };

  return (
    <>
      <TopBar title="Notifications" />
      <div className="page-body">
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '0.625rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {['all', 'unread', 'read'].map(v => (
              <button key={v} className={`chip${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
                {v === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spin" /> Loading...</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <BellOff size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>No notifications {filter === 'unread' ? 'to review' : 'yet'}.</p>
              </div>
            ) : filtered.map((item, index) => {
              const Icon = typeIcon[item.type] || Info;
              const style = typeStyle[item.type] || typeStyle.info;
              return (
                <div key={item.id} onClick={() => { if (!item.read) markRead(item.id); setDetail(item); }} style={{ display: 'flex', gap: '1rem', padding: '1rem', cursor: 'pointer', borderLeft: !item.read ? '4px solid var(--color-primary)' : '4px solid transparent', background: !item.read ? 'var(--color-primary-fixed)' : 'transparent', borderBottom: index < filtered.length - 1 ? '1px solid var(--color-surface-low)' : 'none', alignItems: 'center' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color: style.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <p style={{ margin: 0, fontWeight: item.read ? 500 : 700, fontSize: '0.875rem' }}>{item.title}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', flexShrink: 0 }}>{item.time}</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.body}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-outline)' }} />
                </div>
              );
            })}
          </div>
        )}

        {detail && <DetailModal notification={detail} onClose={() => setDetail(null)} onMarkRead={markRead} />}
      </div>
    </>
  );
};

export default Notifications;
