import { Bell, Search, Menu, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../store/theme';
import { useSidebarStore } from '../store/sidebar';

const TopBar = ({ title }) => {
  const { theme, toggleTheme } = useThemeStore();
  const open = useSidebarStore((s) => s.open);

  return (
    <div className="page-header">
      <button className="hamburger-btn" onClick={open} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <h1 className="page-title">{title}</h1>

      <div className="topbar-actions">
        <div className="search-bar topbar-search">
          <Search size={15} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
          <input placeholder="Search..." />
        </div>

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="topbar-icon-btn"
        >
          {theme === 'dark' ? <Sun size={17} style={{ color: '#fbbf24' }} /> : <Moon size={17} />}
        </button>

        <Link to="/notifications" title="Notifications" className="topbar-icon-btn topbar-link-btn">
          <Bell size={18} />
          <span className="topbar-dot" />
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
