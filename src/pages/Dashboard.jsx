import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Clock, CheckCircle2, TrendingUp, Calendar, PlusCircle,
  ArrowUpRight, Users, Building2, Bell, ClipboardList, Shield,
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';

const fallbackDashboard = {
  volunteer: {
    hero: { subtitle: 'Ready to log your work today?' },
    kpis: [
      { key: 'myHoursWeek', label: 'My Hours (Week)', value: '14h', icon: Clock, color: '#4343d5', bg: 'var(--color-primary-fixed)' },
      { key: 'myTaskCount', label: 'My Tasks', value: '3', icon: ClipboardList, color: '#059669', bg: '#d1fae5' },
      { key: 'assignedEventsCount', label: 'Events Assigned', value: '2', icon: Calendar, color: '#d97706', bg: '#fef3c7' },
    ],
    myTasks: [
      { id: 1, title: 'Prepare onboarding doc', deadline: '2026-03-27', eventTitle: 'Volunteer Drive', status: 'Pending' },
      { id: 2, title: 'Attend health camp setup', deadline: '2026-03-28', eventTitle: 'Health Camp', status: 'In Progress' },
      { id: 3, title: 'Submit volunteer report', deadline: '2026-03-30', eventTitle: null, status: 'Pending' },
    ],
    weeklyHoursChart: [
      { day: 'Mon', hours: 5, tasks: 3 },
      { day: 'Tue', hours: 7, tasks: 5 },
      { day: 'Wed', hours: 4, tasks: 2 },
      { day: 'Thu', hours: 8, tasks: 6 },
      { day: 'Fri', hours: 6, tasks: 4 },
      { day: 'Sat', hours: 3, tasks: 2 },
      { day: 'Sun', hours: 2, tasks: 1 },
    ],
  },
  teamLead: {
    hero: { subtitle: "Your team's daily report is waiting." },
    kpis: [
      { label: 'Team Members', value: '12', icon: Users, color: '#4343d5', bg: 'var(--color-primary-fixed)' },
      { label: 'Team Hours (Week)', value: '86h', icon: Clock, color: '#059669', bg: '#d1fae5' },
      { label: 'Pending Tasks', value: '7', icon: ClipboardList, color: '#d97706', bg: '#fef3c7' },
      { label: 'Logs Submitted', value: '34', icon: CheckCircle2, color: '#059669', bg: '#d1fae5' },
    ],
    teamLogsToday: [
      { member: 'Priya Nair', task: 'Sprint Review', time: '2h 30m', status: 'Completed' },
      { member: 'Rahul Sharma', task: 'API Integration', time: '3h 00m', status: 'In Progress' },
      { member: 'Sam Lee', task: 'Unit Tests', time: '1h 45m', status: 'Completed' },
      { member: 'Carlos V.', task: 'DB Migration', time: '2h 00m', status: 'In Progress' },
    ],
    committeeHoursWeekChart: [
      { day: 'Mon', hours: 5 },
      { day: 'Tue', hours: 7 },
      { day: 'Wed', hours: 4 },
      { day: 'Thu', hours: 8 },
      { day: 'Fri', hours: 6 },
      { day: 'Sat', hours: 3 },
      { day: 'Sun', hours: 2 },
    ],
  },
  admin: {
    hero: { subtitle: 'Monitor wing performance and manage events.' },
    kpis: [
      { label: 'Wing Members', value: '42', icon: Users, color: '#4343d5', bg: 'var(--color-primary-fixed)' },
      { label: 'Committees', value: '5', icon: Building2, color: '#059669', bg: '#d1fae5' },
      { label: 'Wing Hours (Week)', value: '312h', icon: Clock, color: '#d97706', bg: '#fef3c7' },
      { label: 'Active Events', value: '3', icon: Calendar, color: '#7c3aed', bg: '#ede9fe' },
    ],
    committeePerformanceRows: [
      { wing: 'Tech Wing', members: 24, hours: 186, logs: 48, completion: '88%' },
      { wing: 'Community Wing', members: 42, hours: 312, logs: 76, completion: '73%' },
      { wing: 'Health Wing', members: 30, hours: 224, logs: 55, completion: '81%' },
    ],
  },
  superAdmin: {
    hero: { subtitle: 'Full system status is live.' },
    kpis: [
      { label: 'Total Members', value: '114', icon: Users, color: '#4343d5', bg: 'var(--color-primary-fixed)', delta: '-' },
      { label: 'Total Hours (Week)', value: '--', icon: Clock, color: '#059669', bg: '#d1fae5', delta: '-' },
      { label: 'Active Wings', value: '-', icon: Building2, color: '#d97706', bg: '#fef3c7', delta: '-' },
      { label: 'Global Events', value: '-', icon: Calendar, color: '#7c3aed', bg: '#ede9fe', delta: '-' },
    ],
    organizationWideHoursWeekChart: [
      { day: 'Mon', hours: 42 },
      { day: 'Tue', hours: 68 },
      { day: 'Wed', hours: 55 },
      { day: 'Thu', hours: 80 },
      { day: 'Fri', hours: 62 },
      { day: 'Sat', hours: 28 },
      { day: 'Sun', hours: 18 },
    ],
    wingOverviewRows: [
      { wing: 'Tech Wing', members: 24, completion: '88%' },
      { wing: 'Community Wing', members: 42, completion: '73%' },
      { wing: 'Health Wing', members: 30, completion: '81%' },
      { wing: 'HR Wing', members: 18, completion: '92%' },
    ],
  },
};

const HeroBanner = ({ user, role, subtitle }) => {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ background: 'var(--gradient-primary)', borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(67,67,213,0.25)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-40%', right: '-5%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', pointerEvents: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.85, fontWeight: 500 }}>{greeting()},</p>
        <h2 style={{ margin: '0.25rem 0 0.375rem', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff' }}>{user?.name || 'User'}</h2>
        <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.8, overflowWrap: 'anywhere' }}>{subtitle}</p>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(255,255,255,0.2)', padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>
        <Shield size={13} /> {role}
      </span>
    </div>
  );
};

const KpiGrid = ({ items, columns = 4 }) => (
  <div className={`grid-cols-${columns}`} style={{ marginBottom: 0 }}>
    {items.map(({ label, value, icon, color, bg, delta }) => {
      const Icon = icon;
      return (
        <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{value}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{label}</p>
            {delta ? <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--color-on-surface-variant)' }}>{delta}</p> : null}
          </div>
        </div>
      );
    })}
  </div>
);

const VolunteerDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={3} />
    <div className="grid-sidebar-right">
      <div className="card">
        <div className="card-flex-between" style={{ marginBottom: '0.875rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>My Tasks</h3>
          <span className="badge badge-neutral">
            {data?.myTasks?.length || 0} active
          </span>        </div>
        {(data?.myTasks || []).map((task) => (
          <div key={task.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--color-surface-low)' }}>
          <div style={{ width: '3px', background: task.status === 'In Progress' ? 'var(--color-primary)' : 'var(--color-surface-highest)', borderRadius: '9999px', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>{task.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              Due {task.deadline}{task.eventTitle ? ` · ${task.eventTitle}` : ''}
            </p>
          </div>
          <span className={`badge ${task.status === 'In Progress' ? 'badge-primary' : 'badge-neutral'}`}>{task.status}</span>
        </div>
        ))}
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--gradient-primary)', color: '#fff', gap: '0.875rem', minWidth: 0 }}>
        <div style={{ width: '3rem', height: '3rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlusCircle size={24} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Log Your Work</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>Track today's activities</p>
        </div>
        <a href="/logs" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>+ Add Log</a>
      </div>
    </div>
    <div className="card">
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>My Weekly Hours</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data.weeklyHoursChart}>
          <CartesianGrid vertical={false} stroke="var(--color-surface-high)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={{ background: 'var(--color-surface-lowest)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--shadow-card)', fontSize: '0.8125rem' }} />
          <Bar dataKey="hours" name="Hours" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const TeamLeadDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />
    <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Team Logs Today</h3>
          <a href="/logs" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>View all <ArrowUpRight size={12} /></a>
        </div>
        <table className="data-table">
          <thead><tr><th>Member</th><th>Task</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {data.teamLogsToday.map((log, index) => (
              <tr key={`${log.member}-${index}`}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div className="avatar" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.6rem', flexShrink: 0 }}>{log.member?.[0] || 'U'}</div><span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{log.member}</span></div></td>
                <td style={{ fontSize: '0.8125rem' }}>{log.task}</td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{log.time}</td>
                <td><span className={`badge ${log.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{log.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Committee Hours (Week)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.committeeHoursWeekChart}>
            <CartesianGrid vertical={false} stroke="var(--color-surface-high)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: 'var(--color-surface-lowest)', border: 'none', borderRadius: '0.5rem', boxShadow: 'var(--shadow-card)', fontSize: '0.8125rem' }} />
            <Bar dataKey="hours" name="Hours" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="card card-flex-between" style={{ alignItems: 'center', background: 'var(--color-secondary-fixed)' }}>
      <div style={{ width: '3rem', height: '3rem', background: '#b095ff', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bell size={20} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#21005e' }}>Send a team notification</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#4e3397' }}>Alert your committee members about deadlines, updates, or reminders.</p>
      </div>
      <a href="/notifications" className="btn-primary" style={{ textDecoration: 'none', flexShrink: 0 }}>Send Now</a>
    </div>
  </div>
);

const AdminDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Committee Performance</h3>
        <a href="/reports" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>Full report <ArrowUpRight size={12} /></a>
      </div>
      <table className="data-table">
        <thead><tr><th>Committee</th><th>Members</th><th>Hours</th><th>Logs</th><th>Completion</th></tr></thead>
        <tbody>
          {data.committeePerformanceRows.map((row) => (
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
    <div className="grid-cols-3">
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

const SuperAdminDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />
    <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Wing Overview</h3>
        </div>
        <table className="data-table">
          <thead><tr><th>Wing</th><th>Members</th><th>Completion</th></tr></thead>
          <tbody>
            {data.wingOverviewRows.map((row) => (
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
    <div className="grid-cols-4">
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

const normalizeDashboard = (role, payload) => {
  const sections = payload?.sections || {};
  const kpis = Array.isArray(payload?.kpis) ? payload.kpis : [];
  if (!role) return null; // or loader
  if (role === ROLES.VOLUNTEER) {
    const base = fallbackDashboard.volunteer;
    return {
      hero: payload?.hero || base.hero,
      kpis: base.kpis.map((item) => {
        const match = kpis.find((kpi) => kpi.key === item.key);
        return { ...item, value: match ? `${match.value}${match.unit || ''}` : item.value };
      }),
      myTasks: sections.myTasks ?? base.myTasks ?? [],
      weeklyHoursChart: (sections.weeklyHoursChart || base.weeklyHoursChart).map((row) => ({ day: row.day, hours: row.hours ?? row.hrs ?? 0, tasks: row.tasks ?? 0 })),
    };
  }

  if (role === ROLES.TEAM_LEAD) {
    const base = fallbackDashboard.teamLead;
    const values = Object.fromEntries(kpis.map((kpi) => [kpi.key || kpi.label, kpi]));
    return {
      hero: payload?.hero || base.hero,
      kpis: [
        { ...base.kpis[0], value: values.teamMembersCount?.value ?? base.kpis[0].value },
        { ...base.kpis[1], value: values.teamHoursWeek?.value ? `${values.teamHoursWeek.value}h` : base.kpis[1].value },
        { ...base.kpis[2], value: values.pendingTasksCount?.value ?? base.kpis[2].value },
        { ...base.kpis[3], value: values.logsSubmittedCount?.value ?? base.kpis[3].value },
      ],
      teamLogsToday: sections.teamLogsToday || base.teamLogsToday,
      committeeHoursWeekChart: (sections.committeeHoursWeekChart || base.committeeHoursWeekChart).map((row) => ({ day: row.day, hours: row.hours ?? row.hrs ?? 0 })),
    };
  }

  if (role === ROLES.ADMIN) {
    const base = fallbackDashboard.admin;
    const values = Object.fromEntries(kpis.map((kpi) => [kpi.key || kpi.label, kpi]));
    return {
      hero: payload?.hero || base.hero,
      kpis: [
        { ...base.kpis[0], value: values.wingMembers?.value ?? base.kpis[0].value },
        { ...base.kpis[1], value: values.committeesCount?.value ?? base.kpis[1].value },
        { ...base.kpis[2], value: values.wingHoursWeek?.value ? `${values.wingHoursWeek.value}h` : base.kpis[2].value },
        { ...base.kpis[3], value: values.activeEvents?.value ?? base.kpis[3].value },
      ],
      committeePerformanceRows: sections.committeePerformanceRows || base.committeePerformanceRows,
    };
  }

  const base = fallbackDashboard.superAdmin;
  const values = Object.fromEntries(kpis.map((kpi) => [kpi.key || kpi.label, kpi]));
  return {
    hero: payload?.hero || base.hero,
    kpis: [
      { ...base.kpis[0], value: values.totalMembers?.value ?? base.kpis[0].value },
      { ...base.kpis[1], value: values.totalHoursWeek?.value ? `${values.totalHoursWeek.value}h` : base.kpis[1].value },
      { ...base.kpis[2], value: values.activeWings?.value ?? base.kpis[2].value },
      { ...base.kpis[3], value: values.globalEvents?.value ?? base.kpis[3].value },
    ],
    organizationWideHoursWeekChart: (sections.organizationWideHoursWeekChart || base.organizationWideHoursWeekChart).map((row) => ({ day: row.day, hours: row.hours ?? row.hrs ?? 0 })),
    wingOverviewRows: sections.wingOverviewRows || base.wingOverviewRows,
  };
};

const Dashboard = () => {
  const { user, role } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(() => normalizeDashboard(role, null));
  const [error, setError] = useState(null);

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      try {
        const roleView = role === ROLES.TEAM_LEAD ? 'team-lead' : role === ROLES.SUPER_ADMIN ? 'super-admin' : role?.toLowerCase() || 'auto';
        const response = await api.get('/api/dashboard', { params: { roleView } });
        const payload = unwrap(response);
        if (mounted) {
          setDashboardData(normalizeDashboard(role, payload));
          setError(null);
        }
      } catch (dashboardError) {
        if (mounted) {
          setDashboardData(normalizeDashboard(role, null));
          setError(getErrorMessage(dashboardError, 'Unable to load dashboard data.'));
        }
      }
    };
    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [role]);

  const content = useMemo(() => {
    switch (role) {
      case ROLES.VOLUNTEER:
        return <VolunteerDashboard data={dashboardData} />;
      case ROLES.TEAM_LEAD:
        return <TeamLeadDashboard data={dashboardData} />;
      case ROLES.ADMIN:
        return <AdminDashboard data={dashboardData} />;
      case ROLES.SUPER_ADMIN:
        return <SuperAdminDashboard data={dashboardData} />;
      default:
        return <VolunteerDashboard data={dashboardData} />;
    }
  }, [dashboardData, role]);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page-body">
        {error ? <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem' }}>{error}</div> : null}
        <HeroBanner user={user} role={role} subtitle={dashboardData.hero?.subtitle} />
        {content}
      </div>
    </>
  );
};

export default Dashboard;
