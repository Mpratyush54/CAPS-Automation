import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Eye, EyeOff, Zap, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeUser } from '../lib/adapters';

const readAuthPayload = (payload) => {
  const data = payload?.data ? payload.data : payload;
  const user = normalizeUser(data?.user || payload?.user);
  return {
    token: data?.accessToken || data?.token || payload?.accessToken || payload?.token,
    refreshToken: data?.refreshToken || payload?.refreshToken || null,
    user,
    role: user?.role || data?.role || payload?.role || null,
  };
};

const Login = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: '',
    profession: '',
    expertise: '',
    role: 'Volunteer',
  });

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const isSignup = mode === 'signup';

  const setSignup = (key, value) => setSignupForm((current) => ({ ...current, [key]: value }));

  const loginWithBackend = async () => {
    const response = await api.post('/api/auth/login', { email, password });
    const auth = readAuthPayload(unwrap(response));
    if (!auth.token || !auth.user || !auth.role) {
      throw new Error('Login response is missing auth data.');
    }
    login(auth);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await loginWithBackend();
      navigate('/dashboard');
    } catch (backendError) {
      setError(getErrorMessage(backendError, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post('/api/auth/signup', {
        name: signupForm.name,
        email,
        password,
        role: signupForm.role,
        profession: signupForm.profession || undefined,
        expertise: signupForm.expertise || undefined,
      });
      setSuccess('Account created. You can now sign in.');
      setMode('login');
      setPassword('');
    } catch (signupError) {
      setError(getErrorMessage(signupError, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '60vh', height: '60vh', background: 'radial-gradient(circle, rgba(67,67,213,0.08) 0%, transparent 70%)', borderRadius: '9999px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: '50vh', height: '50vh', background: 'radial-gradient(circle, rgba(176,149,255,0.1) 0%, transparent 70%)', borderRadius: '9999px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.875rem', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(67,67,213,0.3)' }}>
            {isSignup ? <UserPlus size={22} color="#ffffff" /> : <Zap size={22} color="#ffffff" />}
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>CAPS Automation</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.375rem' }}>Next-Gen Organizational Workflow</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--color-surface-low)', padding: '0.35rem', borderRadius: '0.75rem' }}>

            {['login', 'signup'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMode(value); setError(null); setSuccess(null); }}
                style={{
                  border: 'none',
                  borderRadius: '0.55rem',
                  padding: '0.7rem 0.9rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  background: mode === value ? 'var(--color-primary)' : 'transparent',
                  color: mode === value ? '#fff' : 'var(--color-on-surface-variant)',
                }}
              >
                {value === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: 0, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            {isSignup ? 'Create your account' : 'Sign in to your account'}
          </h2>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            {isSignup && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-label">Full name</label>
                  <input className="input-field" value={signupForm.name} onChange={(e) => setSignup('name', e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="input-label">Role</label>
                    <select className="input-field" value={signupForm.role} onChange={(e) => setSignup('role', e.target.value)}>
                      {['Volunteer', 'Team Lead', 'Admin', 'Super Admin'].map((role) => <option key={role}>{role}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Profession</label>
                    <input className="input-field" value={signupForm.profession} onChange={(e) => setSignup('profession', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-label">Expertise</label>
                  <input className="input-field" value={signupForm.expertise} onChange={(e) => setSignup('expertise', e.target.value)} />
                </div>
              </>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label">Work email</label>
              <input className="input-field" type="email" placeholder="you@worklog.io" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                {!isSignup && (
                  <button type="button" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)', display: 'flex', padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              {loading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
            {isSignup ? (
              <span>Already have an account? <button type="button" onClick={() => setMode('login')} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', padding: 0, cursor: 'pointer', fontWeight: 700 }}>Sign in</button></span>
            ) : (
              <span>Need an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>Create one</Link></span>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '1.5rem' }}>© 2026 WorkLog Organization System</p>
      </div>
    </div>
  );
};

export default Login;
