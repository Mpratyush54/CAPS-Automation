import { useEffect, useState } from 'react';
import { Bell, BellOff, Send, CheckCheck, Info, AlertTriangle, Calendar, Check, X, ChevronRight, Loader2, ShieldAlert, FileText, CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeNotification } from '../lib/adapters';
import { socket } from '../lib/socket';

const typeIcon = {
  info: Info,
  event: Calendar,
  success: Check,
  warning: AlertTriangle,
  security: ShieldAlert,
  log: FileText,
  approval: CheckCircle,
  revision: HelpCircle
};

const typeStyle = {
  info: { bg: 'rgba(232, 234, 255, 1)', color: 'var(--color-primary)', label: 'Info' },
  event: { bg: 'rgba(238, 232, 255, 1)', color: '#4e3397', label: 'Event' },
  success: { bg: '#d1fae5', color: '#059669', label: 'Success' },
  warning: { bg: '#fef3c7', color: '#d97706', label: 'Warning' },
  security: { bg: '#fee2e2', color: '#dc2626', label: 'Security' },
  log: { bg: 'rgba(232, 234, 255, 1)', color: 'var(--color-primary)', label: 'Log' },
  approval: { bg: '#dcfce7', color: '#16a34a', label: 'Approval' },
  revision: { bg: '#ffedd5', color: '#ea580c', label: 'Revision' }
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay">
    <div className="modal-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-surface-high)' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem' }}><X size={24} /></button>
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem' }}>
        {children}
      </div>
    </div>
  </div>
);

const DetailModal = ({ notification, onClose, onMarkRead }) => {
  const navigate = useNavigate();
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
        {notification.url && (
          <button className="btn-primary" onClick={() => { navigate(notification.url); onClose(); }}>
            View Context <ArrowRight size={14} />
          </button>
        )}
        {!notification.read && <button className="btn-ghost" onClick={() => { onMarkRead(notification.id); onClose(); }}><Check size={14} /> Mark Read</button>}
        <button className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

const ComposeModal = ({ onClose, onSend, role: userRole }) => {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
    audienceType: 'all',
    targetRole: '',
    recipientUserIds: [],
  });
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = ['Admin', 'Super Admin'].includes(userRole);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await api.get('/api/organization/users/all');
        const rows = unwrap(res).rows || [];
        setUsers(rows);
      } catch (e) {
        console.error('Failed to load users', e);
      }
    };
    loadUsers();
  }, []);

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSend(form);
      onClose();
    } catch {} finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRecipient = (userId) => {
    setForm(prev => {
      const exists = prev.recipientUserIds.includes(userId);
      return {
        ...prev,
        recipientUserIds: exists 
          ? prev.recipientUserIds.filter(id => id !== userId)
          : [...prev.recipientUserIds, userId]
      };
    });
  };

  return (
    <Modal title="Send New Notification" onClose={onClose}>
      <div style={{ display: 'grid', gap: '1rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div>
          <label className="input-label">Target Audience</label>
          <select 
            className="input-field"
            value={form.audienceType === 'specific_role' ? `role:${form.targetRole}` : form.audienceType}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('role:')) {
                setForm({ ...form, audienceType: 'specific_role', targetRole: val.split(':')[1] });
              } else {
                setForm({ ...form, audienceType: val, targetRole: '' });
              }
            }}
          >
            {isAdmin && (
              <>
                <option value="all">Entire Organization</option>
                <option value="role:Volunteer">All Volunteers</option>
                <option value="role:Team Lead">All Team Leads</option>
                <option value="role:Admin">All Admins</option>
              </>
            )}
            <option value="team">My Unit / Team Members</option>
            <option value="specific_member">Selected Individual(s)</option>
          </select>
        </div>

        {form.audienceType === 'specific_member' && (
          <div style={{ background: 'var(--color-surface-low)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <input 
                className="input-field" 
                placeholder="Search by name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
            </div>
            
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {filteredUsers.slice(0, 100).map(u => {
                const isSelected = form.recipientUserIds.includes(u._id);
                return (
                  <div 
                    key={u._id} 
                    onClick={() => toggleRecipient(u._id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      padding: '0.5rem', 
                      borderRadius: '0.5rem', 
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary-fixed)' : 'transparent',
                      border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ width: '1rem', height: '1rem', border: '1px solid var(--color-outline)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'white' }}>
                      {isSelected && <Check size={10} color="white" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{u.name}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{u.role} • {u.email}</p>
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-outline)', padding: '1rem' }}>No users found.</p>}
            </div>

            {form.recipientUserIds.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-surface-variant)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>Selected ({form.recipientUserIds.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {form.recipientUserIds.map(id => {
                    const u = users.find(x => x._id === id);
                    if (!u) return null;
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--color-surface-variant)', padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem' }}>
                        {u.name}
                        <X size={10} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleRecipient(id); }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="input-label">Title</label>
            <input 
              className="input-field" 
              placeholder="e.g. Activity Sync" 
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="input-label">Alert Type</label>
            <select 
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="info">Information</option>
              <option value="warning">Warning / Alert</option>
              <option value="success">Success / Milestone</option>
              <option value="revision">Revision Needed</option>
              <option value="approval">Final Approval</option>
            </select>
          </div>
        </div>

        <div>
          <label className="input-label">Message Details</label>
          <textarea 
            className="input-field" 
            rows={4} 
            placeholder="Type your message here..."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ resize: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
          <button 
            className="btn-primary" 
            style={{ flex: 2 }}
            onClick={handleSend} 
            disabled={loading || !form.title || !form.body || (form.audienceType === 'specific_member' && form.recipientUserIds.length === 0)}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />} 
            Dispatch to {form.audienceType === 'specific_member' ? `${form.recipientUserIds.length} Person(s)` : 'Audience'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Notifications = () => {
  const { role, user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [compose, setCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState(Notification.permission);

  const canCompose = ['Team Lead', 'Admin', 'Super Admin'].includes(role);

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

    // LISTEN FOR REAL-TIME NOTIFICATIONS
    const handleNewNotif = (data) => {
      setNotifications(prev => [normalizeNotification(data), ...prev]);
    };

    socket.on('notification:new', handleNewNotif);

    return () => {
      mounted = false;
      socket.off('notification:new', handleNewNotif);
    };
  }, [filter]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filtered = notifications.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : n.read);

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.patch(`/api/notifications/${id}/read`, { read: true });
    } catch { }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.patch('/api/notifications/read-all', {});
    } catch { }
  };

  const sendNotification = async (payload) => {
    setError(null);
    try {
      await api.post('/api/notifications', payload);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send notification.'));
      throw err;
    }
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button className="btn-ghost" onClick={markAllRead}><CheckCheck size={14} /> Clear All</button>
            )}
            {canCompose && (
              <button className="btn-primary" onClick={() => setCompose(true)}>
                <Send size={14} /> Send Notification
              </button>
            )}
          </div>
        </div>

        {permissionState === 'default' && (
          <div className="card" style={{ marginBottom: '1.25rem', background: 'var(--color-primary-container)', borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-on-primary-container)' }}>Enable Push Notifications</h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-primary-container)', opacity: 0.8 }}>Get alerted even when the app is closed.</p>
            </div>
            <button className="btn-primary" onClick={async () => {
              const res = await Notification.requestPermission();
              setPermissionState(res);
              if (res === 'granted') {
                import('../lib/notifications').then(m => m.registerCurrentDevice(true));
              }
            }}>
              Enable
            </button>
          </div>
        )}

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
        {compose && <ComposeModal role={role} onClose={() => setCompose(false)} onSend={sendNotification} />}
      </div>
    </>
  );
};

export default Notifications;
