import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, Calendar,
  BarChart3, Building2, Bell,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import { useAuthStore } from './store/auth';
import { hasMinRole, getNavItems, ROLES } from './rbac';

// Lazy-loaded pages
const Login        = lazy(() => import('./pages/Login'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Logs         = lazy(() => import('./pages/Logs'));
const Events       = lazy(() => import('./pages/Events'));
const Reports      = lazy(() => import('./pages/Reports'));
const Organization = lazy(() => import('./pages/Organization'));
const Notifications= lazy(() => import('./pages/Notifications'));
const Profile      = lazy(() => import('./pages/Profile'));

const NAV_ICONS = { LayoutDashboard, ClipboardList, Calendar, BarChart3, Building2, Bell };

/* ── Guards ──────────────────────────────────────────────────── */
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const RoleGuard = ({ minRole, children }) => {
  const { role } = useAuthStore();
  return hasMinRole(role, minRole) ? children : <Navigate to="/dashboard" replace />;
};

/* ── Spinner ──────────────────────────────────────────────────── */
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
    <div style={{
      width: '2rem', height: '2rem',
      border: '3px solid var(--color-primary-fixed)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '9999px',
      animation: 'spin 0.8s linear infinite',
    }} />
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

/* ── App Layout ──────────────────────────────────────────────── */
const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Suspense fallback={<Spinner />}>
        {children}
      </Suspense>
    </div>
    <MobileNav />
  </div>
);

/* ── App ─────────────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <Suspense fallback={null}><Login /></Suspense>
        } />

        {/* Protected */}
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route index              element={<Dashboard />} />
                <Route path="dashboard"   element={<Dashboard />} />
                <Route path="logs"        element={<Logs />} />
                <Route path="events"      element={<Events />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile"     element={<Profile />} />

                {/* Team Lead+ */}
                <Route path="reports" element={
                  <RoleGuard minRole={ROLES.TEAM_LEAD}><Reports /></RoleGuard>
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
