import { useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Download, FileClock, FileText, Filter, FolderSync } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';

const REPORT_PERIODS = ['Weekly', 'Monthly', '3 Months', '6 Months', 'Yearly'];

const TEAM_REPORTS = [
  { id: 101, team: 'Dev Board', labelOne: 'Tech Wing', period: 'Weekly', periodKey: '2026-W12', title: 'Execution and blockers', status: 'Submitted', owner: 'Alex Rivera', source: 'Manual', generatedFrom: '-', hours: 48 },
  { id: 102, team: 'Dev Board', labelOne: 'Tech Wing', period: 'Monthly', periodKey: 'Mar 2026', title: 'Monthly team summary', status: 'Generated', owner: 'System', source: 'Auto', generatedFrom: '2026-W09 to 2026-W12', hours: 187 },
  { id: 103, team: 'Dev Board', labelOne: 'Tech Wing', period: '3 Months', periodKey: 'Q1 2026', title: 'Quarterly team summary', status: 'Generated', owner: 'System', source: 'Auto', generatedFrom: 'Jan-Mar 2026', hours: 492 },
  { id: 104, team: 'Outreach Team', labelOne: 'Community Wing', period: 'Weekly', periodKey: '2026-W12', title: 'Outreach weekly report', status: 'Missing', owner: 'James T.', source: 'Manual', generatedFrom: '-', hours: 0 },
  { id: 105, team: 'Health Comm.', labelOne: 'Health Wing', period: 'Yearly', periodKey: 'FY 2025-26', title: 'Annual community impact summary', status: 'Generated', owner: 'System', source: 'Auto', generatedFrom: 'Apr 2025-Mar 2026', hours: 1410 },
];

const MOMS = [
  { id: 301, title: 'Volunteer coordination sync', team: 'Dev Board', preparedBy: 'Riya Gupta', role: 'Volunteer', meetingDate: '2026-03-27', status: 'Draft' },
  { id: 302, title: 'Monthly health operations review', team: 'Health Comm.', preparedBy: 'Asha Menon', role: 'Volunteer', meetingDate: '2026-03-22', status: 'Published' },
  { id: 303, title: 'Outreach escalation follow-up', team: 'Outreach Team', preparedBy: 'James T.', role: 'Team Lead', meetingDate: '2026-03-24', status: 'Under Review' },
];

const exportCSV = (rows, filename) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).join(',');
  const body = rows.map((row) => Object.values(row).join(',')).join('\n');
  const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const ReportCenter = () => {
  const { role, user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [selectedTeam, setSelectedTeam] = useState(user?.committee || 'All Teams');
  const [reportRows, setReportRows] = useState(TEAM_REPORTS);

  const canSubmitWeekly = can(role, 'viewTeamReports');
  const canViewAllTeams = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const teams = ['All Teams', ...new Set(TEAM_REPORTS.map((row) => row.team))];
  const visibleReports = useMemo(() => reportRows.filter((row) => {
    const periodMatch = row.period === selectedPeriod;
    const teamMatch = canViewAllTeams ? selectedTeam === 'All Teams' || row.team === selectedTeam : row.team === (user?.committee || 'Dev Board');
    return periodMatch && teamMatch;
  }), [canViewAllTeams, reportRows, selectedPeriod, selectedTeam, user?.committee]);
  const visibleMoms = MOMS.filter((row) => canViewAllTeams || row.team === (user?.committee || 'Dev Board'));

  const submitWeeklyReport = () => {
    const next = { id: Date.now(), team: user?.committee || 'Dev Board', labelOne: user?.wing || 'Tech Wing', period: 'Weekly', periodKey: '2026-W13', title: 'Weekly execution summary', status: 'Submitted', owner: user?.name || 'Team Lead', source: 'Manual', generatedFrom: '-', hours: 54 };
    setReportRows((current) => [next, ...current.filter((row) => !(row.period === 'Weekly' && row.periodKey === next.periodKey && row.team === next.team))]);
  };

  return (
    <>
      <TopBar title="Reports" />
      <div className="page-body">
        <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff', marginBottom: '1rem' }}>
          <div className="card-flex-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.82, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recurring Team Reports</p>
              <h2 style={{ margin: '0.3rem 0', color: '#fff' }}>Each team owns its own report timeline</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.88 }}>Wing and committee are just two labels tied to the same team. Report ownership is team-based, not a parent-child flow.</p>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', minWidth: '230px' }}>
              <div style={{ padding: '0.75rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.14)' }}><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{TEAM_REPORTS.filter((row) => row.period === 'Weekly').length}</div><div style={{ fontSize: '0.75rem', opacity: 0.82 }}>Weekly report streams</div></div>
              <div style={{ padding: '0.75rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.14)' }}><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{TEAM_REPORTS.filter((row) => row.status === 'Missing').length}</div><div style={{ fontSize: '0.75rem', opacity: 0.82 }}>Open escalations</div></div>
            </div>
          </div>
        </div>

        <div className="page-controls">
          <div className="card-action-row" style={{ flexWrap: 'wrap' }}>
            {REPORT_PERIODS.map((period) => <button key={period} className={`chip${selectedPeriod === period ? ' active' : ''}`} onClick={() => setSelectedPeriod(period)}>{period}</button>)}
          </div>
          <div className="card-action-row" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
            {canViewAllTeams && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem' }}>
                <Filter size={13} style={{ color: 'var(--color-outline)' }} />
                <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem' }}>
                  {teams.map((team) => <option key={team}>{team}</option>)}
                </select>
              </div>
            )}
            <button className="btn-secondary" onClick={() => exportCSV(visibleReports, `reports-${selectedPeriod}.csv`)}><Download size={14} /> Export</button>
            {canSubmitWeekly && <button className="btn-primary" onClick={submitWeeklyReport}><FileText size={14} /> Submit Weekly</button>}
          </div>
        </div>

        <div className="card table-card" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-surface-low)' }}>
            <div className="card-flex-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{selectedPeriod} Reports</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Weekly reports are authored by team leads. Monthly, 3 month, 6 month, and yearly reports are generated from those weekly records.</p>
              </div>
              <div style={{ padding: '0.75rem 0.9rem', borderRadius: '0.75rem', background: 'var(--color-surface-low)', maxWidth: '320px', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                Missing report alerts, yearly generation updates, and every other notification rule outcome appears only in the Notifications page.
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Team</th><th>Period</th><th>Status</th><th>Source</th><th>Hours</th></tr></thead>
            <tbody>
              {visibleReports.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ fontWeight: 600 }}>{row.team}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.labelOne}</div></td>
                  <td><div>{row.periodKey}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>{row.title}</div></td>
                  <td><span className={`badge ${row.status === 'Missing' ? 'badge-error' : row.status === 'Submitted' ? 'badge-warning' : 'badge-success'}`}>{row.status}</span></td>
                  <td><div>{row.source}</div>{row.generatedFrom !== '-' ? <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>{row.generatedFrom}</div> : null}</td>
                  <td>{row.hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card table-card" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem' }}><h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>MOM Register</h3><p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>MOMs can be prepared by volunteers, then reviewed and retained alongside team reporting history.</p></div>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Prepared By</th><th>Status</th></tr></thead>
            <tbody>
              {visibleMoms.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ fontWeight: 600 }}>{row.title}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.meetingDate} - {row.team}</div></td>
                  <td>{row.preparedBy} <span style={{ color: 'var(--color-outline)' }}>({row.role})</span></td>
                  <td><span className={`badge ${row.status === 'Published' ? 'badge-success' : row.status === 'Under Review' ? 'badge-warning' : 'badge-neutral'}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-cols-4">
          {[{ label: 'Weekly streams', value: `${TEAM_REPORTS.filter((row) => row.period === 'Weekly').length}`, icon: FileClock }, { label: 'Auto-generated summaries', value: `${TEAM_REPORTS.filter((row) => row.source === 'Auto').length}`, icon: FolderSync }, { label: 'Published MOMs', value: `${MOMS.filter((row) => row.status === 'Published').length}`, icon: CheckCircle2 }, { label: 'Annual reports', value: `${TEAM_REPORTS.filter((row) => row.period === 'Yearly').length}`, icon: CalendarRange }].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card"><div className="card-flex-between"><span className="card-title" style={{ margin: 0 }}>{label}</span><Icon size={14} style={{ color: 'var(--color-primary)' }} /></div><p style={{ margin: '0.45rem 0 0', fontSize: '1.55rem', fontWeight: 700 }}>{value}</p></div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ReportCenter;
