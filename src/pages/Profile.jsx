import { useEffect, useState } from 'react';
import { Camera, Edit2, Save, X, Clock, CheckCircle2, Calendar, Shield, Loader2, Smartphone, Trash2 } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { api, getErrorMessage, unwrap, formatDateTimeLabel } from '../lib/api';
import { registerCurrentDevice } from '../lib/notifications';
import { getDeviceFingerprint } from '../lib/device';

const Profile = () => {
  const { user, role, setUser } = useAuthStore();
  const [serverActivity, setServerActivity] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({ hours: '0', logs: '0' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentFingerprint = getDeviceFingerprint();
  
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    wing: '',
    committee: '',
    joinDate: '',
    bio: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profRes, devRes] = await Promise.all([
        api.get('/api/profile/me'),
        api.get('/api/notifications/devices')
      ]);
      const payload = unwrap(profRes) || {};
      const deviceData = unwrap(devRes) || {};
      
      const nextUser = payload.user || {};
      setForm({
        name: nextUser.name || '',
        email: nextUser.email || '',
        phone: nextUser.phone || '',
        wing: nextUser.wing || '',
        committee: nextUser.committee || '',
        joinDate: nextUser.joinDate?.slice(0, 10) || '',
        bio: nextUser.bio || '',
      });
      
      setStats({
        hours: String(payload.summary?.hours || 0),
        logs: String(payload.summary?.logs || 0),
      });
      
      setDevices(deviceData.devices || []);
      
      setServerActivity((payload.recentActivity || []).map(a => ({
         action: a.action || 'Activity',
         time: formatDateTimeLabel(a.timeLabel),
         type: a.type || 'log'
      })));
      
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSyncDevice = async () => {
    try {
        await registerCurrentDevice(true);
        await loadProfile();
        // Show success briefly
    } catch (err) {
        setError(err.message);
    }
  };

  const removeDevice = async (id) => {
    try {
      await api.delete(`/api/notifications/devices/${id}`);
      setDevices(prev => prev.filter(d => d._id !== id));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not unregister device.'));
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      await api.patch('/api/profile/me', {
        name: form.name,
        phone: form.phone,
        bio: form.bio,
      });
      setUser({ ...user, name: form.name });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update profile.'));
    }
  };

  const roleBadge = { Volunteer: 'badge-neutral', 'Team Lead': 'badge-secondary', Admin: 'badge-primary', 'Super Admin': 'badge-error' };

  return (
    <>
      <TopBar title="User Profile" />
      <div className="page-body">
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '0.625rem' }}>{error}</div>}
        
        <div className="profile-layout">
          <div className="profile-sidebar mobile-safe-grid">
            <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                <div style={{ width: '5rem', height: '5rem', borderRadius: '9999px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 auto' }}>
                  {form.name.charAt(0)}
                </div>
              </div>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', fontWeight: 700 }}>{form.name}</h2>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{form.email}</p>
              <span className={`badge ${roleBadge[role] || 'badge-neutral'}`}>
                <Shield size={10} /> {role}
              </span>
              
              <div className="mobile-safe-grid" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-surface-high)', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ background: 'var(--color-surface-low)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.hours}</p>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Total Hours</p>
                </div>
                <div style={{ background: 'var(--color-surface-low)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.logs}</p>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>Total Logs</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-flex-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Connected Devices</h3>
                <button 
                    className="btn-ghost" 
                    onClick={handleSyncDevice}
                    style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                >
                    Sync This Device
                </button>
              </div>
              <div style={{ display: 'grid', gap: '0.875rem' }}>
                {devices.map((dev) => {
                  const isThisDevice = dev.fingerprint === currentFingerprint;
                  return (
                    <div key={dev._id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.5rem', 
                        background: 'var(--color-surface-low)', 
                        borderRadius: '0.625rem',
                        border: isThisDevice ? '1px solid var(--color-primary-fixed-dim)' : 'none'
                    }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '0.4rem', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Smartphone size={14} style={{ color: isThisDevice ? 'var(--color-primary)' : 'var(--color-outline)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dev.deviceName} {isThisDevice && <span style={{ fontSize: '0.625rem', color: 'var(--color-primary)', fontWeight: 400 }}>(Current)</span>}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-outline)' }}>{dev.platform} • {dev.type === 'web-push' ? 'Real Push' : 'Simple'}</p>
                        </div>
                        <button className="btn-ghost" onClick={() => removeDevice(dev._id)} style={{ padding: '0.25rem', color: 'var(--color-error)' }}><Trash2 size={13} /></button>
                    </div>
                  );
                })}
                {devices.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-outline)', textAlign: 'center', margin: '0.5rem 0' }}>No push-enabled devices found.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 700 }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {serverActivity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem', background: 'var(--color-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={11} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500 }}>{a.action}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{a.time}</p>
                    </div>
                  </div>
                ))}
                {serverActivity.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-outline)', textAlign: 'center' }}>No recent activity recorded.</p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Profile Information</h3>
              {editing ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
                  <button className="btn-primary" onClick={handleSave}><Save size={14} /> Save</button>
                </div>
              ) : (
                <button className="btn-ghost" onClick={() => setEditing(true)}><Edit2 size={14} /> Edit</button>
              )}
            </div>

            <div className="profile-form-grid">
               <div>
                  <label className="input-label">Full Name</label>
                  {editing ? <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} /> : <p className="text-wrap-anywhere" style={{ padding: '0.5rem 0' }}>{form.name || '—'}</p>}
               </div>
               <div>
                  <label className="input-label">Email Address</label>
                  <p className="text-wrap-anywhere" style={{ padding: '0.5rem 0', color: 'var(--color-outline)' }}>{form.email}</p>
               </div>
               <div>
                  <label className="input-label">Phone Number</label>
                  {editing ? <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} /> : <p className="text-wrap-anywhere" style={{ padding: '0.5rem 0' }}>{form.phone || '—'}</p>}
               </div>
               <div>
                  <label className="input-label">Date Joined</label>
                  <p style={{ padding: '0.5rem 0' }}>{form.joinDate || '—'}</p>
               </div>
               <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Bio</label>
                  {editing ? <textarea className="input-field" rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} style={{ resize: 'vertical' }} /> : <p className="text-wrap-anywhere" style={{ padding: '0.5rem 0', lineHeight: 1.6 }}>{form.bio || '—'}</p>}
               </div>
            </div>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-surface-high)' }}>
               <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700 }}>Security</h3>
               <div className="card-action-row">
                  <button className="btn-secondary">Change Password</button>
                  <button className="btn-secondary">Enable 2FA</button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
