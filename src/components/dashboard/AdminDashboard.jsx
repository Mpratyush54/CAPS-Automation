import { ArrowUpRight, Bell, Calendar, Building2 } from 'lucide-react';
import KpiGrid from './KpiGrid';

const AdminDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />
    <div className="card table-card dashboard-table-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Committee Performance</h3>
        <a href="/reports" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>Full report <ArrowUpRight size={12} /></a>
      </div>
      <table className="data-table">
        <thead><tr><th>Committee</th><th>Members</th><th>Hours</th><th>Logs</th><th>Completion</th></tr></thead>
        <tbody>
          {(data.committeePerformanceRows || []).map((row) => (
            <tr key={row.wing}>
              <td style={{ fontWeight: 600 }}>{row.wing}</td>
              <td>{row.members}</td>
              <td>{row.hours}h</td>
              <td>{row.logs}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: '4px', background: 'var(--color-surface-high)', borderRadius: '9999px' }}>
                    <div style={{ width: row.completion, height: '100%', background: 'var(--gradient-primary)', borderRadius: '9999px' }} />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', minWidth: '2.5rem', textAlign: 'right' }}>{row.completion}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid-cols-3 responsive-grid-3">
      {[
        { label: 'Create Wing Event', icon: Calendar, href: '/events', color: 'var(--color-primary)', bg: 'var(--color-primary-fixed)' },
        { label: 'Manage Committees', icon: Building2, href: '/organization', color: '#059669', bg: '#d1fae5' },
        { label: 'Send Wing Notification', icon: Bell, href: '/notifications', color: '#7c3aed', bg: '#ede9fe' },
      ].map(({ label, icon, href, color, bg }) => {
        const Icon = icon;
        return (
          <a key={label} href={href} style={{ textDecoration: 'none' }}>
            <div className="card card-flex-between" style={{ alignItems: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="text-wrap-anywhere" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{label}</span>
              <ArrowUpRight size={14} style={{ color: 'var(--color-outline)', marginLeft: 'auto' }} />
            </div>
          </a>
        );
      })}
    </div>
  </div>
);

export default AdminDashboard;
