import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';
import { formatDateTimeLabel } from '../lib/api';

// Extracted Components
import HeroBanner from '../components/dashboard/HeroBanner';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import VolunteerDashboard from '../components/dashboard/VolunteerDashboard';
import TeamLeadDashboard from '../components/dashboard/TeamLeadDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import SuperAdminDashboard from '../components/dashboard/SuperAdminDashboard';

// Hooks
import { useDashboard } from '../hooks/useDashboard';

// Config
import { Clock, ClipboardList, FileText, Calendar, Users, Building2 } from 'lucide-react';

const fallbackDashboard = {
  volunteer: {
    hero: { subtitle: 'Ready to log your work today?' },
    kpis: [
      { key: 'myHoursWeek', label: 'My Hours (Week)', value: '14h', icon: Clock, color: '#4343d5', bg: 'var(--color-primary-fixed)' },
      { key: 'myTaskCount', label: 'My Tasks', value: '3', icon: ClipboardList, color: '#059669', bg: '#d1fae5' },
      { key: 'myMomsCount', label: 'MOMs Submitted', value: '1', icon: FileText, color: '#7c3aed', bg: '#ede9fe' },
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
      { key: 'pendingTasksCount', label: 'Pending Tasks', value: '7', icon: ClipboardList, color: '#d97706', bg: '#fef3c7' },
      { key: 'teamMomsCount', label: 'Team MOMs', value: '4', icon: FileText, color: '#7c3aed', bg: '#ede9fe' },
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
      { key: 'wingHoursWeek', label: 'Wing Hours (Week)', value: '312h', icon: Clock, color: '#d97706', bg: '#fef3c7' },
      { key: 'orgMomsCount', label: 'Total MOMs', value: '12', icon: FileText, color: '#7c3aed', bg: '#ede9fe' },
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
      { key: 'activeWings', label: 'Active Wings', value: '-', icon: Building2, color: '#d97706', bg: '#fef3c7', delta: '-' },
      { key: 'orgMomsCount', label: 'Total MOMs', value: '-', icon: FileText, color: '#7c3aed', bg: '#ede9fe', delta: '-' },
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
        { ...base.kpis[3], value: values.teamMomsCount?.value ?? base.kpis[3].value },
      ],
      teamLogsToday: (sections.teamLogsToday || base.teamLogsToday).map(log => ({
        ...log,
        time: formatDateTimeLabel(log.time)
      })),
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
      { ...base.kpis[3], value: values.orgMomsCount?.value ?? base.kpis[3].value },
    ],
    organizationWideHoursWeekChart: (sections.organizationWideHoursWeekChart || base.organizationWideHoursWeekChart).map((row) => ({ day: row.day, hours: row.hours ?? row.hrs ?? 0 })),
    wingOverviewRows: sections.wingOverviewRows || base.wingOverviewRows,
  };
};

const Dashboard = () => {
  const { user, role } = useAuthStore();
  const { data: rawData, isLoading, error: dashboardError } = useDashboard(role);

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  const dashboardData = useMemo(() => normalizeDashboard(role, rawData), [role, rawData]);

  const content = useMemo(() => {
    if (!dashboardData) return null;
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

  const error = dashboardError?.message;

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page-body">
        {error ? <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem' }}>{error}</div> : null}
        <div className="dashboard-flow">
          <HeroBanner user={user} role={role} subtitle={dashboardData?.hero?.subtitle} />
          {isLoading ? <DashboardSkeleton /> : content}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
