import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  LayoutDashboard, ClipboardList, Calendar,
  BarChart3, Building2, Bell, FileText,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import { useAuthStore } from './store/auth';
import { hasMinRole, getNavItems, ROLES } from './rbac';
import { initSocket, disconnectSocket, socket } from './lib/socket';
import { getDeviceFingerprint, getNotificationState, getDeviceInfo } from './lib/device';
import { api } from './lib/api';
import { registerCurrentDevice, checkDeviceSync } from './lib/notifications';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Logs = lazy(() => import('./pages/Logs'));
const Events = lazy(() => import('./pages/Events'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportCenter = lazy(() => import('./pages/ReportCenter'));
const Organization = lazy(() => import('./pages/Organization'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Moms = lazy(() => import('./pages/Moms'));

const NAV_ICONS = { LayoutDashboard, ClipboardList, Calendar, BarChart3, Building2, Bell, FileText };

/* ── Guards ──────────────────────────────────────────────────── */
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const RoleGuard = ({ minRole, children }) => {
  const { role } = useAuthStore();
  return hasMinRole(role, minRole) ? children : <Navigate to="/dashboard" replace />;
};

/* ── Premium Loader ─────────────────────────────────────────── */
const PremiumLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '2rem' }}>
    <div className="loader-orbit">
      <div className="loader-core" />
      <div className="loader-ring layer-1" />
      <div className="loader-ring layer-2" />
      <div className="loader-ring layer-3" />
    </div>
    <div style={{
      fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--color-primary)',
      animation: 'fadeIn 1s ease-in-out infinite alternate'
    }}>
      Loading CAPS Automation...
    </div>
  </div>
);

/* ── Mobile Bottom Nav ───────────────────────────────────────── */
const MobileNav = () => {
  const { role } = useAuthStore();
  const navItems = getNavItems(role).slice(0, 5);

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navItems.map(({ to, icon, label }) => {
        const Icon = NAV_ICONS[icon];
        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            {Icon && <Icon size={21} />}
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

/* ── PWA & Notifications Onboarding ───────────────────────── */
const OnboardingBanner = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const info = getDeviceInfo();

  useEffect(() => {
    const checkOnboarding = async () => {
      // 1. PWA Install Logic
      const handleBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstall(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // 2. Notification Verification Logic
      const isSynced = await checkDeviceSync();
      const state = getNotificationState();
      
      if (state !== 'granted' || !isSynced) {
        setShowNotify(true);
      }

      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
    checkOnboarding();
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
    }
  };

  const handleNotifyClick = async () => {
    try {
      await registerCurrentDevice(true);
      setShowNotify(false);
    } catch (e) {
      console.error('Registration failed:', e);
    }
  };

  if (!showInstall && !showNotify) return null;

  return (
    <div className="onboarding-container">
      {showInstall && (
        <div className="banner install-banner pulse-border">
          <div className="banner-content">
            <span className="icon">📲</span>
            <div>
              <strong>Install {info.os} App</strong>
              <p>Get a faster experience & background updates.</p>
            </div>
          </div>
          <button className="btn-primary-glow sm" onClick={handleInstallClick}>Install</button>
        </div>
      )}
      {showNotify && (
        <div className="banner notify-banner">
          <div className="banner-content">
            <span className="icon">🔔</span>
            <div>
              <strong>Stay Updated</strong>
              <p>Enable real-time worklog & event alerts.</p>
            </div>
          </div>
          <button className="btn-accent sm" onClick={handleNotifyClick}>Enable</button>
        </div>
      )}
    </div>
  );
};

/* ── App Layout ──────────────────────────────────────────────── */
const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <OnboardingBanner />
      <Suspense fallback={<PremiumLoader />}>
        {children}
      </Suspense>
    </div>
    <MobileNav />
  </div>
);

/* ── App ─────────────────────────────────────────────────────── */
function App() {
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (token && user?.id) {
      initSocket(user.id);

      // Listen for REAL-TIME NOTIFICATIONS globally
      const handleGlobalNotification = (data) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'New Notification', {
            body: data.body || 'New update available.',
            icon: '/favicon.svg',
            tag: data.id || 'new-notif'
          });
        }
      };

      socket.on('notification:new', handleGlobalNotification);

      // Background registration only if not already synced (Silent sync)
      checkDeviceSync().then(isSynced => {
        if (!isSynced && getNotificationState() === 'granted') {
          registerCurrentDevice(false).catch(() => {});
        }
      });

      return () => {
        socket.off('notification:new', handleGlobalNotification);
        disconnectSocket();
      };
    } else {
      disconnectSocket();
    }
  }, [token, user?.id]);

  return (
    <BrowserRouter>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <Suspense fallback={<PremiumLoader />}><Login /></Suspense>
        } />
        <Route path="/signup" element={
          <Suspense fallback={<PremiumLoader />}><Login initialMode="signup" /></Suspense>
        } />

        {/* Protected */}
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="logs" element={<Logs />} />
                <Route path="events" element={<Events />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<Profile />} />
                <Route path="moms" element={<Moms />} />

                {/* Team Lead+ */}
                <Route path="reports" element={
                  <RoleGuard minRole={ROLES.TEAM_LEAD}><Reports /></RoleGuard>
                } />
                <Route path="report-center" element={
                  <RoleGuard minRole={ROLES.TEAM_LEAD}><ReportCenter /></RoleGuard>
                } />
                <Route path="organization" element={
                  <RoleGuard minRole={ROLES.TEAM_LEAD}><Organization /></RoleGuard>
                } />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
