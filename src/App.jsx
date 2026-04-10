import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { hasMinRole, ROLES } from './rbac';
import { initSocket, disconnectSocket, socket } from './lib/socket';
import { getNotificationState } from './lib/device';
import { registerCurrentDevice, checkDeviceSync } from './lib/notifications';
import PremiumLoader from './components/common/PremiumLoader';
import ScrollToTop from './components/common/ScrollToTop';
import AppLayout from './components/layout/AppLayout';
import { useViewportTracker } from './hooks/useViewportTracker';

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

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

const RoleGuard = ({ minRole, children }) => {
  const { role } = useAuthStore();
  return hasMinRole(role, minRole) ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { user, token } = useAuthStore();
  useViewportTracker();

  useEffect(() => {
    if (token && user?.id) {
      initSocket(user.id);

      const handleGlobalNotification = (data) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'New Notification', {
            body: data.body || 'New update available.',
            icon: '/favicon.svg',
            tag: data.id || 'new-notif',
          });
        }
      };

      socket.on('notification:new', handleGlobalNotification);

      checkDeviceSync().then((isSynced) => {
        if (!isSynced && getNotificationState() === 'granted') {
          registerCurrentDevice(false).catch(() => {});
        }
      });

      return () => {
        socket.off('notification:new', handleGlobalNotification);
        disconnectSocket();
      };
    }

    disconnectSocket();
    return undefined;
  }, [token, user?.id]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PremiumLoader />}><Login /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<PremiumLoader />}><Login initialMode="signup" /></Suspense>} />

        <Route
          path="/*"
          element={(
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
                  <Route path="reports" element={<RoleGuard minRole={ROLES.TEAM_LEAD}><Reports /></RoleGuard>} />
                  <Route path="report-center" element={<RoleGuard minRole={ROLES.TEAM_LEAD}><ReportCenter /></RoleGuard>} />
                  <Route path="organization" element={<RoleGuard minRole={ROLES.TEAM_LEAD}><Organization /></RoleGuard>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
