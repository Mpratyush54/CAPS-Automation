import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Download, FileClock, FileText, Filter, FolderSync, Loader2, AlertCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';
import { normalizeMom, normalizeReportRow } from '../lib/adapters';

const REPORT_PERIODS = ['Weekly', 'Monthly', '3 Months', '6 Months', 'Yearly'];

const ReportCenter = () => {
  const { role, user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');
  const [reportRows, setReportRows] = useState([]);
  const [moms, setMoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canSubmitWeekly = can(role, 'viewTeamReports');
  const canViewAllTeams = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const teams = useMemo(() => ['All Teams', ...new Set(reportRows.map((row) => row.team))], [reportRows]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [reportsResponse, momsResponse] = await Promise.all([
          api.get('/api/reports', { params: { periodType: selectedPeriod.toLowerCase().replace(' ', '_'), teamId: canViewAllTeams ? undefined : user?.committee } }),
          api.get('/api/reports/moms'),
        ]);
        if (!mounted) return;
        const reportPayload = unwrap(reportsResponse);
        const momPayload = unwrap(momsResponse);
        setReportRows((reportPayload?.rows || []).map(normalizeReportRow));
        setMoms((momPayload?.rows || []).map(normalizeMom));
        setError(null);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load report directory.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [selectedPeriod, canViewAllTeams, user?.committee]);

  const visibleReports = reportRows.filter((row) => {
    const periodMatch = row.period === selectedPeriod || row.period === selectedPeriod.toLowerCase();
    const teamMatch = canViewAllTeams ? selectedTeam === 'All Teams' || row.team === selectedTeam : true;
    return periodMatch && teamMatch;
  });

  const visibleMoms = moms.filter((row) => canViewAllTeams || row.team === (user?.committee || 'Dev Board'));

  const submitWeeklyReport = async () => {
    setError(null);
    try {
      await api.post('/api/reports/weekly', {
        weekKey: `2026-W${Math.floor(Math.random() * 52) + 1}`,
        title: 'Weekly Task Summary',
        hours: 0,
        status: 'submitted',
      });
      // reload
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to submit weekly report.'));
    }
  };

  return (
    <>
      <TopBar title="Report Center" />
      <div className="page-body">
        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: '0.625rem' }}>{error}</div>}

        <div className="card" style={{ background: 'var(--gradient-primary)', color: '#fff', marginBottom: '1rem' }}>
          <div className="card-flex-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.82, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Organization Governance</p>
              <h2 style={{ margin: '0.3rem 0', color: '#fff' }}>CAPS Automation Report Repository</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.88 }}>Systematically tracking weekly, monthly, and yearly performance across all organizational units.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', minWidth: '240px' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.14)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{reportRows.filter(r => r.period === 'Weekly').length}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.82 }}>Weekly Reports</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.14)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{moms.length}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.82 }}>MOMs Prepared</div>
              </div>
            </div>
          </div>
        </div>

        <div className="page-controls" style={{ marginBottom: '1rem' }}>
          <div className="card-action-row" style={{ flexWrap: 'wrap' }}>
            {REPORT_PERIODS.map((period) => <button key={period} className={`chip${selectedPeriod === period ? ' active' : ''}`} onClick={() => setSelectedPeriod(period)}>{period}</button>)}
          </div>
          <div className="card-action-row" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
            {canViewAllTeams && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', background: 'var(--color-surface-low)', borderRadius: '0.5rem' }}>
                <Filter size={13} style={{ color: 'var(--color-outline)' }} />
                <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8125rem' }}>
                  {teams.map((team) => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>
            )}
            {canSubmitWeekly && <button className="btn-primary" onClick={submitWeeklyReport}><FileText size={14} /> Submit Weekly</button>}
          </div>
        </div>

        <div className="card table-card" style={{ marginBottom: '1rem' }}>
          <table className="data-table">
            <thead><tr><th>Team</th><th>Period</th><th>Status</th><th>Source</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {loading && reportRows.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="spin" /></td></tr>
              ) : visibleReports.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ fontWeight: 600 }}>{row.team}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.labelOne}</div></td>
                  <td><div>{row.periodKey}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>{row.title}</div></td>
                  <td><span className={`badge ${row.status === 'Missing' ? 'badge-error' : row.status === 'Submitted' ? 'badge-warning' : 'badge-success'}`}>{row.status}</span></td>
                  <td><div>{row.source}</div></td>
                  <td style={{ textAlign: 'right' }}><button className="btn-ghost"><Download size={14} /></button></td>
                </tr>
              ))}
              {!loading && visibleReports.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-outline)' }}>No reports found for this selection.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card table-card">
          <div style={{ padding: '1rem 1.25rem' }}><h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>MOM Register</h3></div>
          <table className="data-table">
            <thead><tr><th>Title</th><th>Prepared By</th><th>Status</th></tr></thead>
            <tbody>
              {loading && moms.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="spin" /></td></tr>
              ) : visibleMoms.map((row) => (
                <tr key={row.id}>
                  <td><div style={{ fontWeight: 600 }}>{row.title}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.meetingDate} - {row.team}</div></td>
                  <td>{row.preparedBy}</td>
                  <td><span className={`badge ${row.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span></td>
                </tr>
              ))}
              {!loading && visibleMoms.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-outline)' }}>No MOMs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ReportCenter;
