import { Shield } from 'lucide-react';

const HeroBanner = ({ user, role, subtitle }) => {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ background: 'var(--gradient-primary)', borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(67,67,213,0.25)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-40%', right: '-5%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', pointerEvents: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.85, fontWeight: 500 }}>{greeting()},</p>
        <h2 style={{ margin: '0.25rem 0 0.375rem', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff' }}>{user?.name || 'User'}</h2>
        <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.8, overflowWrap: 'anywhere' }}>{subtitle}</p>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.2)', padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>
        <Shield size={13} /> {role}
      </span>
    </div>
  );
};

export default HeroBanner;
