import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Bell, Calendar, Users, TrendingUp } from 'lucide-react';
import KpiGrid from './KpiGrid';

const SuperAdminDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />
    <div className="mobile-safe-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1rem' }}>
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Organization-Wide Hours (Week)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.organizationWideHoursWeekChart}>
            <CartesianGrid vertical={false} stroke="var(--color-surface-high)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ background: 'var(--color-surface-lowest)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--shadow-card)', fontSize: '0.8125rem' }} />
            <Bar dataKey="hours" name="Total Hours" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card table-card dashboard-table-card">
        <div style={{ padding: '1rem 1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Wing Overview</h3>
        </div>
        <table className="data-table">
          <thead><tr><th>Wing</th><th>Members</th><th>Completion</th></tr></thead>
          <tbody>
            {(data.wingOverviewRows || []).map((row) => (
              <tr key={row.wing}>
                <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{row.wing}</td>
                <td style={{ fontSize: '0.8125rem' }}>{row.members}</td>
                <td><span className={`badge ${parseInt(row.completion, 10) >= 85 ? 'badge-success' : 'badge-warning'}`}>{row.completion}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div className="grid-cols-4 responsive-grid-4">
      {[
        { label: 'Manage Users', icon: Users, href: '/organization', color: '#4343d5', bg: 'var(--color-primary-fixed)' },
        { label: 'Create Global Event', icon: Calendar, href: '/events', color: '#059669', bg: '#d1fae5' },
        { label: 'Global Notification', icon: Bell, href: '/notifications', color: '#7c3aed', bg: '#ede9fe' },
        { label: 'System Reports', icon: TrendingUp, href: '/reports', color: '#d97706', bg: '#fef3c7' },
      ].map(({ label, icon, href, color, bg }) => {
        const Icon = icon;
        return (
          <a key={label} href={href} style={{ textDecoration: 'none' }}>
            <div className="card card-flex-between" style={{ alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-wrap-anywhere" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', lineHeight: 1.3 }}>{label}</span>
            </div>
          </a>
        );
      })}
    </div>
  </div>
);

export default SuperAdminDashboard;
