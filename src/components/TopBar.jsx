import { Bell, Search, Menu, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../store/theme';
import { useSidebarStore } from '../store/sidebar';

const TopBar = ({ title }) => {
  const { theme, toggleTheme } = useThemeStore();
  const open = useSidebarStore((s) => s.open);

  return (
    <div className="page-header">
      {/* Hamburger (mobile only — visible via CSS) */}
      <button
        className="hamburger-btn"
        onClick={open}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="page-title">{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginLeft: 'auto', flexShrink: 0 }}>
        {/* Search bar — hidden on mobile via CSS class */}
        <div className="search-bar topbar-search" style={{ minWidth: '200px' }}>
          <Search size={15} style={{ color: 'var(--color-outline)', flexShrink: 0 }} />
          <input placeholder="Search…" />
        </div>

        {/* Dark / Light toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2.25rem', height: '2.25rem',
            background: 'var(--color-surface-low)',
            border: 'none', borderRadius: '0.5rem',
            cursor: 'pointer',
            color: 'var(--color-on-surface-variant)',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          {theme === 'dark'
            ? <Sun  size={17} style={{ color: '#fbbf24' }} />
            : <Moon size={17} />
          }
        </button>

        {/* Notifications */}
        <Link
          to="/notifications"
          title="Notifications"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2.25rem', height: '2.25rem',
            background: 'var(--color-surface-low)',
            borderRadius: '0.5rem',
            color: 'var(--color-on-surface-variant)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '8px', height: '8px',
            background: 'var(--color-primary)',
            borderRadius: '9999px',
            border: '1.5px solid var(--color-surface-lowest)',
          }} />
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
