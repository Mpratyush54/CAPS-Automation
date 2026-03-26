import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Eye, EyeOff, Zap, AlertCircle, Loader2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  // Volunteers belong to exactly one wing + committee
  { email: 'volunteer@worklog.io',  password: 'password', role: 'Volunteer',   name: 'Jamie Park',    wing: 'Tech Wing',       committee: 'Dev Board'       },
  { email: 'volunteer2@worklog.io', password: 'password', role: 'Volunteer',   name: 'Riya Gupta',   wing: 'Community Wing',  committee: 'Events Comm.'    },
  // Team Lead — manages a committee
  { email: 'lead@worklog.io',       password: 'password', role: 'Team Lead',   name: 'Alex Rivera',  wing: 'Tech Wing',       committee: 'Dev Board'       },
  // Admin — manages a full wing
  { email: 'admin@worklog.io',      password: 'password', role: 'Admin',       name: 'Morgan Chen',  wing: 'Community Wing',  committee: null              },
  // Super Admin — full access
  { email: 'superadmin@worklog.io', password: 'password', role: 'Super Admin', name: 'Jordan Smith', wing: null,              committee: null              },
  { email: 'admin@example.com',     password: 'password', role: 'Super Admin', name: 'Admin User',   wing: null,              committee: null              },
];

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // simulate network

    const account = DEMO_ACCOUNTS.find(
      a => a.email === email && a.password === password
    );

    if (account) {
      const token = `mock-jwt-${Date.now()}`;
      login({
        token,
        role: account.role,
        user: {
          name:      account.name,
          email:     account.email,
          wing:      account.wing,
          committee: account.committee,
        },
      });
      navigate('/dashboard');
    } else {
      setError('Invalid email or password. Try: admin@worklog.io / password');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-10%', width: '60vh', height: '60vh',
        background: 'radial-gradient(circle, rgba(67,67,213,0.08) 0%, transparent 70%)',
        borderRadius: '9999px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-10%', width: '50vh', height: '50vh',
        background: 'radial-gradient(circle, rgba(176,149,255,0.1) 0%, transparent 70%)',
        borderRadius: '9999px', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '0.875rem',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(67,67,213,0.3)',
          }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            WorkLog
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.375rem' }}>
            The Kinetic Work Organization System
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: 0, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Sign in to your account
          </h2>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.75rem', borderRadius: '0.5rem',
              background: 'var(--color-error-container)',
              color: 'var(--color-on-error-container)',
              fontSize: '0.8125rem', marginBottom: '1.25rem',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Work email</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@worklog.io"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                <button type="button" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-outline)', display: 'flex', padding: 0,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: '1.25rem', padding: '0.75rem', borderRadius: '0.5rem',
            background: 'var(--color-surface-low)',
            fontSize: '0.75rem', color: 'var(--color-on-surface-variant)',
          }}>
            <strong style={{ color: 'var(--color-on-surface)', display: 'block', marginBottom: '0.25rem' }}>Demo accounts</strong>
            volunteer@worklog.io · lead@worklog.io · admin@worklog.io · superadmin@worklog.io
            <br />All passwords: <strong style={{ color: 'var(--color-primary)' }}>password</strong>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '1.5rem' }}>
          © 2026 WorkLog Organization System
        </p>
      </div>
    </div>
  );
};

export default Login;
