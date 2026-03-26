import { useState } from 'react';
import { Camera, Edit2, Save, X, Clock, CheckCircle2, Calendar, Shield } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';

const activityLog = [
  { action: 'Sprint Planning Review logged', time: '30m ago', type: 'log' },
  { action: 'Annual Volunteer Drive registered', time: '2h ago', type: 'event' },
  { action: 'Q1 Review Board notification sent', time: '1d ago', type: 'notif' },
  { action: 'Budget Review started', time: '2d ago', type: 'log' },
];

const Profile = () => {
  const { user, role, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    name:       user?.name || 'User',
    email:      user?.email || 'user@worklog.io',
    phone:      '+91 98765 43210',
    wing:       'Tech Wing',
    committee:  'Dev Board',
    joinDate:   '2025-09-15',
    bio:        'Passionate volunteer with a focus on technology-driven solutions for organizational growth.',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    setUser({ name: form.name, email: form.email });
    setEditing(false);
  };

  const roleBadge = { Volunteer: 'badge-neutral', 'Team Lead': 'badge-secondary', Admin: 'badge-primary', 'Super Admin': 'badge-error' };

  return (
    <>
      <TopBar title="Profile" />
      <div className="page-body">
        <div className="profile-layout">

          {/* Left: Avatar + info card */}
          <div className="profile-sidebar">
            <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                <div style={{
                  width: '5rem', height: '5rem', borderRadius: '9999px',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 auto',
                  boxShadow: '0 8px 24px rgba(67,67,213,0.25)',
                }}>
                  {form.name.charAt(0)}
                </div>
                <button style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '1.75rem', height: '1.75rem', borderRadius: '9999px',
                  background: 'var(--color-primary)', border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}>
                  <Camera size={11} />
                </button>
              </div>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', fontWeight: 700 }}>{form.name}</h2>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{form.email}</p>
              <span className={`badge ${roleBadge[role] || 'badge-neutral'}`} style={{ fontSize: '0.75rem' }}>
                <Shield size={10} /> {role || 'Member'}
              </span>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-surface-high)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[{ label: 'Hours', value: '234' }, { label: 'Logs', value: '64' }].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--color-surface-low)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                    <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="card">
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 700 }}>Recent Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {activityLog.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: 'var(--color-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {a.type === 'log' ? <Clock size={11} style={{ color: 'var(--color-primary)' }} /> : a.type === 'event' ? <Calendar size={11} style={{ color: 'var(--color-primary)' }} /> : <CheckCircle2 size={11} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 }}>{a.action}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Edit form */}
          <div className="card">
            <div className="profile-header">
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Personal Information</h3>
              {editing ? (
                <div className="profile-actions">
                  <button className="btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
                  <button className="btn-primary" onClick={handleSave}><Save size={14} /> Save</button>
                </div>
              ) : (
                <button className="btn-ghost" onClick={() => setEditing(true)}><Edit2 size={14} /> Edit Profile</button>
              )}
            </div>

            <div className="profile-form-grid">
              {[
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Email Address', key: 'email', type: 'email' },
                { label: 'Phone Number', key: 'phone', type: 'tel' },
                { label: 'Date Joined', key: 'joinDate', type: 'date' },
                { label: 'Wing', key: 'wing', type: 'text' },
                { label: 'Committee', key: 'committee', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="input-label">{label}</label>
                  {editing ? (
                    <input className="input-field" type={type} value={form[key]} onChange={e => set(key, e.target.value)} />
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface)', padding: '0.625rem 0' }}>
                      {form[key] || '—'}
                    </p>
                  )}
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Bio</label>
                {editing ? (
                  <textarea className="input-field" rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} style={{ resize: 'vertical' }} />
                ) : (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface)', lineHeight: 1.6, padding: '0.625rem 0' }}>{form.bio}</p>
                )}
              </div>
            </div>

            {/* Security section */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-surface-high)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700 }}>Security</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary">Change Password</button>
                <button className="btn-secondary">Two-Factor Auth</button>
                <button className="btn-danger">Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
