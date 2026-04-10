import { useEffect, useState, useMemo } from 'react';
import { 
  Camera, Edit2, Save, X, Clock, 
  Shield, Smartphone, Trash2, 
  Fingerprint, Zap, ExternalLink 
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { formatDateTimeLabel, getErrorMessage } from '../lib/api';
import { registerCurrentDevice } from '../lib/notifications';
import { getDeviceFingerprint } from '../lib/device';

// UI Components
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import TextField from '../components/ui/TextField';

// Hooks
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useRegisteredDevices, useUnregisterDevice } from '../hooks/useNotifications';

const Profile = () => {
  const { user: authUser, role, setUser } = useAuthStore();
  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: devices = [], refetch: refetchDevices } = useRegisteredDevices();
  
  const updateProfileMutation = useUpdateProfile();
  const unregisterDeviceMutation = useUnregisterDevice();
  
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const currentFingerprint = getDeviceFingerprint();
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (profileData?.user) {
      setForm({
        name: profileData.user.name || '',
        email: profileData.user.email || '',
        phone: profileData.user.phone || '',
        bio: profileData.user.bio || '',
      });
    }
  }, [profileData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSyncDevice = async () => {
    try {
        await registerCurrentDevice(true);
        refetchDevices();
    } catch (err) {
        setError(err.message);
    }
  };

  const removeDevice = async (id) => {
    try {
      await unregisterDeviceMutation.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not unregister device.'));
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      await updateProfileMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        bio: form.bio,
      });
      setUser({ ...authUser, name: form.name });
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update profile.'));
    }
  };

  const serverActivity = useMemo(() => (profileData?.recentActivity || []).map(a => ({
     action: a.action || 'System Access',
     time: formatDateTimeLabel(a.timeLabel),
     type: a.type || 'log'
  })), [profileData]);

  const stats = useMemo(() => ({
    hours: String(profileData?.summary?.hours || 0),
    logs: String(profileData?.summary?.logs || 0),
  }), [profileData]);

  const ROLE_VARIANTS = {
    Volunteer: 'neutral',
    'Team Lead': 'secondary',
    Admin: 'primary',
    'Super Admin': 'error'
  };

  if (profileLoading) return (
     <>
       <TopBar title="User Profile" />
       <div className="page-body">
         <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto' }} />
            <div className="skeleton" style={{ width: '200px', height: '2rem', margin: '2rem auto 0' }} />
         </div>
       </div>
     </>
  );

  return (
    <>
      <TopBar title="Agent Identity" />
      <div className="page-body">
        {error && <Alert variant="error" style={{ marginBottom: '1.5rem' }}>{error}</Alert>}
        
        <div className="profile-layout-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 350px) 1fr', gap: '2rem', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'var(--gradient-primary)', opacity: 0.1 }} />
              
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem', zIndex: 1 }}>
                <div style={{ 
                  width: '7rem', height: '7rem', borderRadius: '50%', 
                  background: 'var(--gradient-primary)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', 
                  fontSize: '3rem', fontWeight: 800, color: '#fff', 
                  margin: '0 auto', boxShadow: '0 12px 40px rgba(67,67,213,0.25)',
                  border: '4px solid white'
                }}>
                  {form.name.charAt(0)}
                </div>
              </div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{form.name}</h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{form.email}</p>
              <Badge variant={ROLE_VARIANTS[role] || 'neutral'} style={{ padding: '6px 16px', borderRadius: '12px' }}>
                <Shield size={14} style={{ marginRight: '6px' }} /> {role.toUpperCase()}
              </Badge>
              
              <div style={{ 
                marginTop: '2.5rem', paddingTop: '2.5rem', 
                borderTop: '1px solid var(--color-outline-variant)', 
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' 
              }}>
                <div style={{ background: 'var(--color-surface-low)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--color-outline-variant)' }}>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{stats.hours}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Mission Hours</p>
                </div>
                <div style={{ background: 'var(--color-surface-low)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--color-outline-variant)' }}>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{stats.logs}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Data Submissions</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <Fingerprint size={18} style={{ color: 'var(--color-primary)' }} />
                   <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Authorized Devices</h3>
                </div>
                <button onClick={handleSyncDevice} className="btn-ghost sm" style={{ fontSize: '0.75rem', fontWeight: 800 }}>SYNC NEW</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {devices.map((dev) => {
                  const isThisDevice = dev.fingerprint === currentFingerprint;
                  return (
                    <div key={dev._id} style={{ 
                        display: 'flex', alignItems: 'center', gap: '1rem', 
                        padding: '1rem', background: isThisDevice ? 'var(--color-primary-fixed)' : 'var(--color-surface-low)', 
                        borderRadius: '16px', border: isThisDevice ? '1px solid var(--color-primary)' : '1px solid var(--color-outline-variant)'
                    }}>
                        <div style={{ 
                          width: '2.75rem', height: '2.75rem', borderRadius: '12px', 
                          background: 'white', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.06)'
                        }}>
                          <Smartphone size={20} style={{ color: isThisDevice ? 'var(--color-primary)' : 'var(--color-outline)' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {dev.deviceName}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500, opacity: 0.6 }}>{dev.platform} • {isThisDevice ? 'Current Agent' : 'Remote Access'}</p>
                        </div>
                        <button className="btn-ghost sm" onClick={() => removeDevice(dev._id)} style={{ color: 'var(--color-error)' }}><Trash2 size={16} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div className="card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <Zap size={22} style={{ color: 'var(--color-primary)' }} />
                     <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Core Credentials</h3>
                  </div>
                  {editing ? (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-ghost sm" onClick={() => setEditing(false)} style={{ fontWeight: 800 }}>ABORT</button>
                      <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 20px' }}><Save size={16} /> SYNC CHANGES</button>
                    </div>
                  ) : (
                    <button className="btn-secondary sm" onClick={() => setEditing(true)} style={{ fontWeight: 800, gap: '8px' }}><Edit2 size={16} /> MODIFY PROFILE</button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                   <div style={{ gridColumn: editing ? 'auto' : '1/-1' }}>
                      {editing ? (
                        <TextField label="Full Identity Name" value={form.name} onChange={e => set('name', e.target.value)} />
                      ) : (
                        <div style={{ padding: '0.5rem 0' }}>
                           <label className="input-label" style={{ opacity: 0.4, letterSpacing: '0.1em' }}>IDENTIFIER SIGNATURE</label>
                           <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{form.name}</p>
                        </div>
                      )}
                   </div>
                   
                   {!editing && (
                     <div style={{ padding: '0.5rem 0' }}>
                        <label className="input-label" style={{ opacity: 0.4, letterSpacing: '0.1em' }}>GLOBAL ACCESS ENDPOINT</label>
                        <p style={{ margin: '4px 0 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{form.email}</p>
                     </div>
                   )}

                   <div>
                      {editing ? (
                        <TextField label="Communication Channel (Phone)" value={form.phone} onChange={e => set('phone', e.target.value)} />
                      ) : (
                        <div style={{ padding: '0.5rem 0' }}>
                           <label className="input-label" style={{ opacity: 0.4, letterSpacing: '0.1em' }}>CONTACT SECURE LINE</label>
                           <p style={{ margin: '4px 0 0', fontSize: '1.125rem', fontWeight: 700 }}>{form.phone || '—'}</p>
                        </div>
                      )}
                   </div>

                   <div style={{ gridColumn: '1 / -1' }}>
                      {editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                           <label className="input-label">Executive Intelligence Brief (Bio)</label>
                           <textarea className="input-field" rows={6} value={form.bio} onChange={e => set('bio', e.target.value)} style={{ resize: 'vertical', borderRadius: '16px' }} />
                        </div>
                      ) : (
                        <div style={{ padding: '1rem 0', marginTop: '1rem', borderTop: '1px solid var(--color-outline-variant)' }}>
                           <label className="input-label" style={{ opacity: 0.4, letterSpacing: '0.1em' }}>MISSION BIOGRAPHY</label>
                           <p style={{ margin: '8px 0 0', lineHeight: 1.8, fontSize: '1.0625rem', opacity: 0.8, fontWeight: 500 }}>{form.bio || 'Agent bio is classified or not yet provided.'}</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="card" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={20} style={{ color: 'var(--color-primary)' }} />
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Access Intelligence Log</h3>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {serverActivity.map((a, i) => (
                      <div key={i} style={{ 
                        display: 'flex', gap: '1.25rem', alignItems: 'center', 
                        padding: '1rem', background: 'var(--color-surface-low)', 
                        borderRadius: '16px', border: '1px solid var(--color-outline-variant)'
                      }}>
                         <div style={{ 
                           width: '2.5rem', height: '2.5rem', borderRadius: '50%', 
                           background: 'white', display: 'flex', 
                           alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                           boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                         }}>
                            <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                         </div>
                         <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>{a.action}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-outline)' }}>{a.time}</p>
                         </div>
                         <ExternalLink size={14} style={{ opacity: 0.3 }} />
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
