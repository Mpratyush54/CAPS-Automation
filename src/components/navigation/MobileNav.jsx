import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Calendar, BarChart3, Building2, Bell, FileText,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { getNavItems } from '../../rbac';

const NAV_ICONS = { LayoutDashboard, ClipboardList, Calendar, BarChart3, Building2, Bell, FileText };

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

export default MobileNav;
