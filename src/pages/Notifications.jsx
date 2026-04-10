import { useEffect, useState, useMemo } from 'react';
import { 
  Bell, BellOff, Send, CheckCheck, Info, 
  AlertTriangle, Calendar, Check, X, 
  ChevronRight, Loader2, ShieldAlert, 
  FileText, CheckCircle, HelpCircle, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { getErrorMessage } from '../lib/api';
import { socket } from '../lib/socket';

// UI Components
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Modal from '../components/Modal';
import TextField from '../components/ui/TextField';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';

// Hooks
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead, 
  useSendBroadcast 
} from '../hooks/useNotifications';
import { useMembers } from '../hooks/useOrganization';

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
  info: { bg: 'rgba(232, 234, 255, 1)', color: 'var(--color-primary)', label: 'Info', variant: 'primary' },
  event: { bg: 'rgba(238, 232, 255, 1)', color: '#4e3397', label: 'Event', variant: 'secondary' },
  success: { bg: '#d1fae5', color: '#059669', label: 'Success', variant: 'success' },
  warning: { bg: '#fef3c7', color: '#d97706', label: 'Warning', variant: 'warning' },
  security: { bg: '#fee2e2', color: '#dc2626', label: 'Security', variant: 'error' },
  log: { bg: 'rgba(232, 234, 255, 1)', color: 'var(--color-primary)', label: 'Log', variant: 'neutral' },
  approval: { bg: '#dcfce7', color: '#16a34a', label: 'Approval', variant: 'success' },
  revision: { bg: '#ffedd5', color: '#ea580c', label: 'Revision', variant: 'warning' }
};

const DetailModal = ({ notification, onClose, onMarkRead }) => {
  const navigate = useNavigate();
  const Icon = typeIcon[notification.type] || Info;
  const style = typeStyle[notification.type] || typeStyle.info;

  return (
    <Modal title="Broadcast Transmission" onClose={onClose} maxWidth="550px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', padding: '1.5rem', background: 'var(--color-surface-low)', borderRadius: '20px' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '14px', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Icon size={22} style={{ color: style.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <Badge variant={style.variant} style={{ marginBottom: '8px' }}>{style.label}</Badge>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{notification.title}</h3>
          </div>
        </div>
        
        <div style={{ padding: '0.5rem', lineHeight: 1.8, color: 'var(--color-on-surface-variant)', fontSize: '1rem', fontWeight: 500 }}>
           {notification.body}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.25rem', background: 'var(--color-surface-low)', borderRadius: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Unit</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.9375rem', fontWeight: 700 }}>{notification.from || 'Central Intelligence'}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transmission Time</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.9375rem', fontWeight: 700 }}>{notification.fullTime || notification.time}</p>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          {notification.url && (
            <button className="btn-primary" onClick={() => { navigate(notification.url); onClose(); }} style={{ flex: 1.5, padding: '12px' }}>
              Jump to Source <ArrowRight size={16} />
            </button>
          )}
          {!notification.read && (
            <button className="btn-ghost" onClick={() => { onMarkRead(notification.id, notification.serverId); onClose(); }} style={{ flex: 1, fontWeight: 800 }}>
              <CheckCircle size={16} /> Acknowledge
            </button>
          )}
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1, fontWeight: 800 }}>Dismiss</button>
        </div>
      </div>
    </Modal>
  );
};

const ComposeModal = ({ onClose, role: userRole }) => {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
    audienceType: 'all',
    targetRole: '',
    recipientUserIds: [],
  });
  
  const { data: users = [], isLoading: usersLoading } = useMembers(); // Fetch all if no teamId
  const sendBroadcastMutation = useSendBroadcast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = ['Admin', 'Super Admin'].includes(userRole);

  const handleSend = async () => {
    try {
      await sendBroadcastMutation.mutateAsync(form);
      onClose();
    } catch (e) {
      alert(getErrorMessage(e));
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

  const audienceOptions = isAdmin ? [
    { label: 'Global (Entire Organization)', value: 'all' },
    { label: 'All Volunteers', value: 'role:Volunteer' },
    { label: 'All Team Leads', value: 'role:Team Lead' },
    { label: 'All Admins', value: 'role:Admin' },
    { label: 'Unit Strategic Sync (My Team)', value: 'team' },
    { label: 'Targeted Agents (Specific Members)', value: 'specific_member' }
  ] : [
    { label: 'Unit Strategic Sync (My Team)', value: 'team' },
    { label: 'Targeted Agents (Specific Member)', value: 'specific_member' }
  ];

  return (
    <Modal title="Broadcast Transmission Dispatch" onClose={onClose} maxWidth="650px">
      <div style={{ display: 'grid', gap: '1.5rem', maxHeight: '78vh', overflowY: 'auto', paddingRight: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
           <Select 
             label="Target Audience Group" 
             value={form.audienceType === 'specific_role' ? `role:${form.targetRole}` : form.audienceType}
             onChange={(e) => {
               const val = e.target.value;
               if (val.startsWith('role:')) {
                 setForm({ ...form, audienceType: 'specific_role', targetRole: val.split(':')[1] });
               } else {
                 setForm({ ...form, audienceType: val, targetRole: '' });
               }
             }}
             options={audienceOptions}
           />
           <Select 
             label="Alert Signature Type" 
             value={form.type} 
             onChange={e => setForm({...form, type: e.target.value})}
             options={[
               { label: 'Information', value: 'info' },
               { label: 'Security/Priority', value: 'security' },
               { label: 'Milestone Success', value: 'success' },
               { label: 'Strategic Warning', value: 'warning' },
               { label: 'Approval Necessary', value: 'approval' },
               { label: 'Revision Protocol', value: 'revision' }
             ]}
           />
        </div>

        {form.audienceType === 'specific_member' && (
          <div style={{ background: 'var(--color-surface-low)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--color-outline-variant)' }}>
            <label className="input-label" style={{ marginBottom: '8px', opacity: 0.6 }}>Agent Selection Interface</label>
            <input 
              className="input-field sm" 
              placeholder="Search by operative name or email hash..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'var(--color-surface-lowest)' }}
            />
            
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '1rem' }}>
              {usersLoading ? <Loader2 size={16} className="spin" /> : filteredUsers.slice(0, 50).map(u => {
                const isSelected = form.recipientUserIds.includes(u._id);
                return (
                  <div 
                    key={u._id} 
                    onClick={() => toggleRecipient(u._id)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', 
                      padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary-fixed)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '20px', height: '20px', border: '2px solid var(--color-outline)', 
                      borderRadius: '6px', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', background: isSelected ? 'var(--color-primary)' : 'white',
                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-outline)'
                    }}>
                      {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>{u.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5, fontWeight: 600 }}>{u.role.toUpperCase()} • {u.committee || 'Field Operative'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <TextField 
          label="Broadcast Headline Signature" 
          placeholder="Enter a descriptive title for this transmission..." 
          value={form.title} 
          onChange={e => setForm({...form, title: e.target.value})} 
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="input-label">Operational Payload (Message)</label>
          <textarea 
            className="input-field" 
            rows={5} 
            placeholder="Synthesize the primary content of this dispatch..."
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ resize: 'none', borderRadius: '16px' }}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
          <button className="btn-ghost" onClick={onClose} disabled={sendBroadcastMutation.isPending} style={{ flex: 1, fontWeight: 800 }}>ABORT</button>
          <button 
            className="btn-primary" 
            style={{ flex: 2, padding: '12px' }}
            onClick={handleSend} 
            disabled={sendBroadcastMutation.isPending || !form.title || !form.body || (form.audienceType === 'specific_member' && form.recipientUserIds.length === 0)}
          >
            {sendBroadcastMutation.isPending ? <Loader2 size={18} className="spin" /> : <Send size={18} />} 
            DISPATCH BROADCAST
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Notifications = () => {
  const { role } = useAuthStore();
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [compose, setCompose] = useState(false);
  const [localReadIds, setLocalReadIds] = useState(() => new Set());
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const { data: notifications = [], isLoading, error: fetchError, refetch } = useNotifications({ 
    filter: filter === 'all' ? undefined : filter, 
    page: 1, 
    pageSize: 50 
  });
  
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const canCompose = ['Team Lead', 'Admin', 'Super Admin'].includes(role);
  const safeNotifications = useMemo(() => notifications.map((item, index) => {
    const serverId = item.id || item._id || item.notificationId || null;
    const localId = serverId || `notif-${index}`;
    const isRead = !!(item.read ?? item.isRead ?? item.seen ?? item.acknowledged);
    return {
      ...item,
      id: localId,
      serverId,
      title: item.title || item.subject || 'Untitled notification',
      body: item.body || item.message || '',
      read: isRead || localReadIds.has(localId),
      time: item.time || item.timeLabel || item.createdAtLabel || '',
      fullTime: item.fullTime || item.createdAt || item.timestamp || item.time || '',
      url: item.url || item.redirectUrl || null,
    };
  }), [notifications, localReadIds]);

  useEffect(() => {
    // LISTEN FOR REAL-TIME NOTIFICATIONS
    const handleNewNotif = () => {
      refetch();
    };
    socket.on('notification:new', handleNewNotif);
    return () => { socket.off('notification:new', handleNewNotif); };
  }, [refetch]);

  const unreadCount = useMemo(() => safeNotifications.filter(n => !n.read).length, [safeNotifications]);
  const filtered = useMemo(() => {
    if (filter === 'unread') return safeNotifications.filter((n) => !n.read);
    if (filter === 'read') return safeNotifications.filter((n) => n.read);
    return safeNotifications;
  }, [filter, safeNotifications]);

  const handleMarkRead = async (id, serverId) => {
    setLocalReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (!serverId) return;
    try {
      await markReadMutation.mutateAsync(serverId);
    } catch { }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch { }
  };

  const error = fetchError ? getErrorMessage(fetchError) : null;

  return (
    <>
      <TopBar title="Intelligence Dispatch" />
      <div className="page-body">
        {error && <Alert variant="error" style={{ marginBottom: '1.5rem' }}>{error}</Alert>}

        <div className="notification-toolbar">
          <div className="notification-filters" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--color-surface-low)', padding: '6px', borderRadius: '14px' }}>
            {['all', 'unread', 'read'].map(v => (
              <button 
                key={v} 
                className={`btn-ghost sm ${filter === v ? 'active' : ''}`} 
                onClick={() => setFilter(v)}
                style={{ 
                  borderRadius: '10px', padding: '10px 20px', fontWeight: 800,
                  background: filter === v ? 'var(--color-surface-lowest)' : 'transparent',
                  color: filter === v ? 'var(--color-primary)' : 'inherit',
                  boxShadow: filter === v ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {v.toUpperCase()}
                {v === 'unread' && unreadCount > 0 && (
                   <span style={{ 
                     marginLeft: '10px', background: 'var(--color-error)', 
                     color: 'white', borderRadius: '8px', fontSize: '10px', 
                     padding: '2px 8px', fontWeight: 900
                   }}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
          <div className="notification-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button className="btn-ghost sm" onClick={handleMarkAllRead} style={{ fontWeight: 800 }}><CheckCheck size={16} /> DATA ACKNOWLEDGED (ALL)</button>
            )}
            {canCompose && (
              <button className="btn-primary" onClick={() => setCompose(true)} style={{ padding: '0.75rem 1.5rem', borderRadius: '14px' }}>
                <Send size={18} /> DISPATCH NEW BROADCAST
              </button>
            )}
          </div>
        </div>

        {permissionState === 'default' && (
          <div className="card" style={{ 
            marginBottom: '2rem', background: 'var(--gradient-primary)', 
            border: 'none', color: 'white', display: 'flex', 
            alignItems: 'center', gap: '2rem', padding: '2rem',
            borderRadius: '24px', boxShadow: '0 8px 32px rgba(67,67,213,0.2)'
          }}>
            <div style={{ 
              width: '4rem', height: '4rem', borderRadius: '50%', 
              background: 'rgba(255,255,255,0.2)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <Bell size={28} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Authorize External Push Transmissions</h4>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', opacity: 0.85, fontWeight: 500 }}>Stay synchronized with global unit alerts even when session is inactive.</p>
            </div>
            <button className="btn-secondary" style={{ background: 'var(--color-surface-lowest)', border: 'none', color: 'var(--color-primary)', fontWeight: 800, padding: '12px 24px' }} onClick={async () => {
              const res = await Notification?.requestPermission();
              setPermissionState(res);
              if (res === 'granted') {
                import('../lib/notifications').then(m => m.registerCurrentDevice(true));
              }
            }}>
              AUTHORIZE NOW
            </button>
          </div>
        )}

        {isLoading && safeNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem' }}>
             <Loader2 className="spin" size={40} style={{ color: 'var(--color-primary)', opacity: 0.4 }} />
             <p style={{ marginTop: '1.5rem', fontWeight: 800, opacity: 0.4, letterSpacing: '0.05em' }}>SYNCHRONIZING DISPATCH LOGS...</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, border: '1px solid var(--color-outline-variant)', borderRadius: '24px', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <EmptyState 
                icon={BellOff} 
                title="Silence Detected" 
                message={`The communication channel is currently silent. No ${filter === 'unread' ? 'unread' : ''} broadcasts found.`} 
              />
            ) : filtered.map((item, index) => {
              const Icon = typeIcon[item.type] || Info;
              const style = typeStyle[item.type] || typeStyle.info;
              return (
                <div 
                  key={item.id} 
                  onClick={() => { if (!item.read) handleMarkRead(item.id, item.serverId); setDetail(item); }} 
                  style={{ 
                    display: 'flex', gap: '1.5rem', padding: '1.5rem 2rem', cursor: 'pointer', 
                    borderLeft: !item.read ? '6px solid var(--color-primary)' : '6px solid transparent', 
                    background: !item.read ? 'var(--color-primary-fixed)' : 'transparent', 
                    borderBottom: index < filtered.length - 1 ? '1px solid var(--color-outline-variant)' : 'none', 
                    alignItems: 'center', transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  className="notification-item"
                >
                  <div style={{ 
                    width: '3.5rem', height: '3.5rem', borderRadius: '16px', 
                    background: style.bg, display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                  }}>
                    <Icon size={20} style={{ color: style.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: item.read ? 700 : 900, fontSize: '1.125rem', color: !item.read ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', letterSpacing: '-0.01em' }}>{item.title}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 700, flexShrink: 0, opacity: 0.8 }}>
                        {(item.time || '').toString().toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', fontWeight: 500, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                       {item.body}
                    </p>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--color-outline)', opacity: 0.3 }} />
                </div>
              );
            })}
          </div>
        )}

        {detail && <DetailModal notification={detail} onClose={() => setDetail(null)} onMarkRead={handleMarkRead} />}
        {compose && <ComposeModal role={role} onClose={() => setCompose(false)} />}
      </div>
      <style>{`
        .notification-item:hover {
          background: var(--color-surface-low) !important;
        }
      `}</style>
    </>
  );
};

export default Notifications;
