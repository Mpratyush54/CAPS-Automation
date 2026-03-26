import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Calendar, BarChart3,
  Building2, Bell, LogOut, Zap, X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { getNavItems, ROLES } from '../rbac';
import { useSidebarStore } from '../store/sidebar';

const ICONS = { LayoutDashboard, ClipboardList, Calendar, BarChart3, Building2, Bell };

const roleColors = {
  [ROLES.VOLUNTEER]:   { bg: 'var(--color-surface-high)',    color: 'var(--color-on-surface-variant)' },
  [ROLES.TEAM_LEAD]:   { bg: 'var(--color-secondary-fixed)', color: 'var(--color-secondary)' },
  [ROLES.ADMIN]:       { bg: 'var(--color-primary-fixed)',   color: 'var(--color-primary)' },
  [ROLES.SUPER_ADMIN]: { bg: '#fef3c7',                      color: '#d97706' },
};

const Sidebar = () => {
  const { user, role, logout } = useAuthStore();
  const navigate  = useNavigate();
  const navItems  = getNavItems(role);
  const roleStyle = roleColors[role] || roleColors[ROLES.VOLUNTEER];

  const { isOpen, close } = useSidebarStore();

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) close();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            display: 'block',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 49,
          }}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Logo + close btn row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.5rem' }}>
          <div className="sidebar-logo" style={{ margin: 0, padding: 0 }}>
            <Zap size={18} style={{ display: 'inline', marginRight: '6px', color: '#6b6bff' }} />
            Work<span>Log</span>
          </div>
          <button
            onClick={close}
            aria-label="Close sidebar"
            className="sidebar-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <p className="section-label" style={{ marginTop: 0 }}>Navigation</p>
        <nav>
          {navItems.map(({ to, icon, label }) => {
            const Icon = ICONS[icon];
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                {Icon && <Icon size={17} />}
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User block */}
        <div style={{ marginTop: 'auto' }}>
          <p className="section-label">Account</p>
          <div style={{ background: 'var(--color-surface-lowest)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '0.75rem', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div className="avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.75rem', flexShrink: 0 }}>
                {(user?.name || 'U').charAt(0)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'User'}
                </p>
                <span style={{
                  display: 'inline-block', marginTop: '3px',
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', padding: '1px 6px', borderRadius: '9999px',
                  background: roleStyle.bg, color: roleStyle.color,
                }}>
                  {role || 'Member'}
                </span>
              </div>
            </div>
            {(user?.wing || user?.committee) && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', padding: '0.375rem 0.5rem', background: 'var(--color-surface-low)', borderRadius: '0.375rem', lineHeight: 1.4 }}>
                {[user.wing, user.committee].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <button
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-error)', fontSize: '0.8125rem' }}
            onClick={handleLogout}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border: none;
          background: var(--color-surface-high);
          border-radius: 0.5rem;
          cursor: pointer;
          color: var(--color-on-surface-variant);
          transition: background 0.15s;
        }
        .sidebar-close-btn:hover { background: var(--color-surface-highest); }
        @media (max-width: 768px) {
          .sidebar-close-btn { display: flex; }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
