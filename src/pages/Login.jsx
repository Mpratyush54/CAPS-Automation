import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Eye, EyeOff, Zap, Loader2, UserPlus, Mail, Lock, User, Briefcase, Award } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { authService } from '../services/authService';

// UI Components
import Alert from '../components/ui/Alert';
import TextField from '../components/ui/TextField';
import Select from '../components/ui/Select';

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

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const auth = await authService.login(email, password);
      login(auth);
      navigate('/dashboard');
    } catch (backendError) {
      setError(getErrorMessage(backendError, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authService.signup({
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
      {/* Background Decor */}
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '60vh', height: '60vh', background: 'radial-gradient(circle, rgba(67,67,213,0.08) 0%, transparent 70%)', borderRadius: '9999px', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: '50vh', height: '50vh', background: 'radial-gradient(circle, rgba(176,149,255,0.1) 0%, transparent 70%)', borderRadius: '9999px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 24px rgba(67,67,213,0.3)' }}>
            {isSignup ? <UserPlus size={24} color="#ffffff" /> : <Zap size={24} color="#ffffff" />}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>CAPS Automation</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 500 }}>Management System for Modern Units</p>
        </div>

        <div className="card" style={{ padding: '2rem', border: '1px solid var(--color-outline-variant)' }}>
          {/* Mode Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem', background: 'var(--color-surface-low)', padding: '4px', borderRadius: '12px' }}>
            <button
               onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
               className={`btn-ghost sm ${mode === 'login' ? 'active' : ''}`}
               style={{ 
                 borderRadius: '8px', padding: '10px',
                 background: mode === 'login' ? 'white' : 'transparent',
                 boxShadow: mode === 'login' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                 color: mode === 'login' ? 'var(--color-primary)' : 'inherit',
                 fontWeight: 700
               }}
            >
               Sign In
            </button>
            <button
               onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
               className={`btn-ghost sm ${mode === 'signup' ? 'active' : ''}`}
               style={{ 
                 borderRadius: '8px', padding: '10px',
                 background: mode === 'signup' ? 'white' : 'transparent',
                 boxShadow: mode === 'signup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                 color: mode === 'signup' ? 'var(--color-primary)' : 'inherit',
                 fontWeight: 700
               }}
            >
               Sign Up
            </button>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            {isSignup ? 'Begin your journey' : 'Welcome back'}
          </h2>

          {error && <Alert variant="error" style={{ marginBottom: '1.5rem' }}>{error}</Alert>}
          {success && <Alert variant="success" style={{ marginBottom: '1.5rem' }}>{success}</Alert>}

          <form onSubmit={isSignup ? handleSignup : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isSignup && (
              <>
                <TextField 
                  label="Full Name" 
                  icon={User} 
                  value={signupForm.name} 
                  onChange={(e) => setSignup('name', e.target.value)} 
                  required 
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <Select 
                     label="Role" 
                     value={signupForm.role} 
                     onChange={(e) => setSignup('role', e.target.value)} 
                     options={['Volunteer', 'Team Lead', 'Admin', 'Super Admin']} 
                   />
                   <TextField 
                     label="Profession" 
                     icon={Briefcase} 
                     value={signupForm.profession} 
                     onChange={(e) => setSignup('profession', e.target.value)} 
                   />
                </div>
                <TextField 
                  label="Expertise" 
                  icon={Award} 
                  value={signupForm.expertise} 
                  onChange={(e) => setSignup('expertise', e.target.value)} 
                />
              </>
            )}

            <TextField 
              label="Work Email" 
              type="email" 
              icon={Mail} 
              autoComplete="email"
              placeholder="you@worklog.io"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ margin: 0 }}>Password</label>
                {!isSignup && (
                  <button type="button" className="btn-ghost sm" style={{ padding: 0, fontSize: '0.8125rem' }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }} />
                <input 
                  className="input-field" 
                  type={showPass ? 'text' : 'password'} 
                  placeholder="Password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)', display: 'flex', padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '0.5rem' }}>
              {loading && <Loader2 size={18} className="spin" />}
              {loading ? (isSignup ? 'Creating Account...' : 'Signing In...') : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8125rem', marginTop: '1.5rem', color: 'var(--color-on-surface-variant)' }}>
            {isSignup ? (
              <>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, padding: 0, cursor: 'pointer' }}>Sign in instead</button></>
            ) : (
              <>Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>Join our network</Link></>
            )}
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '2rem', opacity: 0.5 }}>
          © 2026 CAPS Organization Workflow. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
