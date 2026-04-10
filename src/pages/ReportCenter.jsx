import { useMemo, useState } from 'react';
import { Download, FileText, Filter, Loader2, Database, ShieldCheck } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES, can } from '../rbac';
import { getErrorMessage } from '../lib/api';
import { normalizeMom, normalizeReportRow } from '../lib/adapters';

// UI Components
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import EmptyState from '../components/ui/EmptyState';

// Hooks
import { useReports, useSubmitWeeklyReport } from '../hooks/useReports';
import { useMoms } from '../hooks/useMoms';

const REPORT_PERIODS = ['Weekly', 'Monthly', '3 Months', '6 Months', 'Yearly'];

const ReportCenter = () => {
  const { role, user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState('Weekly');
  const [selectedTeam, setSelectedTeam] = useState('All Teams');

  const canSubmitWeekly = can(role, 'viewTeamReports');
  const canViewAllTeams = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useReports({ 
    periodType: selectedPeriod.toLowerCase().replace(' ', '_'), 
    teamId: canViewAllTeams ? undefined : user?.committee 
  });

  const { data: moms = [], isLoading: momsLoading } = useMoms();
  const submitWeeklyMutation = useSubmitWeeklyReport();

  const reportRows = useMemo(() => reports.map(normalizeReportRow), [reports]);
  const normalizedMoms = useMemo(() => moms.map(normalizeMom), [moms]);

  const teams = useMemo(() => ['All Teams', ...new Set(reportRows.map((row) => row.team))], [reportRows]);

  const visibleReports = useMemo(() => reportRows.filter((row) => {
    const periodMatch = row.period === selectedPeriod || row.period === selectedPeriod.toLowerCase();
    const teamMatch = canViewAllTeams ? selectedTeam === 'All Teams' || row.team === selectedTeam : true;
    return periodMatch && teamMatch;
  }), [reportRows, selectedPeriod, selectedTeam, canViewAllTeams]);

  const visibleMoms = useMemo(() => normalizedMoms.filter((row) => 
    canViewAllTeams || row.team === (user?.committee || 'Dev Board')
  ), [normalizedMoms, canViewAllTeams, user?.committee]);

  const submitWeeklyReport = async () => {
    try {
      await submitWeeklyMutation.mutateAsync({
        weekKey: `2026-W${Math.floor(Math.random() * 52) + 1}`,
        title: 'Weekly Operational Sync',
        hours: 0,
        status: 'submitted',
      });
    } catch (submitError) {
      alert(getErrorMessage(submitError, 'Unable to submit weekly report.'));
    }
  };

  const loading = reportsLoading || momsLoading;
  const error = reportsError ? getErrorMessage(reportsError) : null;

  return (
    <>
      <TopBar title="Intelligence & Reporting" />
      <div className="page-body">
        {error && <Alert variant="error" style={{ marginBottom: '1.5rem' }}>{error}</Alert>}

        <div className="card" style={{ 
          background: 'var(--gradient-primary)', 
          border: 'none', 
          color: '#fff', 
          marginBottom: '2rem',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(67,67,213,0.15)',
          borderRadius: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} style={{ opacity: 0.8 }} />
                <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8 }}>Operational Integrity System</p>
              </div>
              <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>Intelligence Repository</h2>
              <p style={{ margin: '0.75rem 0 0', fontSize: '1rem', opacity: 0.85, fontWeight: 500 }}>High-fidelity performance analytics and automated sync protocols.</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '350px' }}>
              <div style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{reportRows.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginTop: '4px' }}>LOGGED REPORTS</div>
              </div>
              <div style={{ padding: '1.25rem', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{moms.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginTop: '4px' }}>PROTOCOL ARCHIVES</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="tab-group scroll-x" style={{ display: 'flex', gap: '0.4rem', background: 'var(--color-surface-low)', padding: '4px', borderRadius: '12px', minWidth: 0, overflowX: 'auto' }}>
            {REPORT_PERIODS.map((period) => (
              <button 
                key={period} 
                className={`btn-ghost sm ${selectedPeriod === period ? 'active' : ''}`} 
                onClick={() => setSelectedPeriod(period)}
                style={{ 
                  padding: '8px 16px', borderRadius: '8px', fontWeight: 700,
                  background: selectedPeriod === period ? 'white' : 'transparent',
                  color: selectedPeriod === period ? 'var(--color-primary)' : 'inherit',
                  boxShadow: selectedPeriod === period ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {period}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {canViewAllTeams && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', background: 'var(--color-surface-low)', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', flex: 1, minWidth: '200px' }}>
                <Filter size={16} style={{ color: 'var(--color-outline)' }} />
                <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)} 
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', width: '100%' }}
                >
                  {teams.map((team) => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>
            )}
            {canSubmitWeekly && (
              <button className="btn-primary" onClick={submitWeeklyReport} disabled={submitWeeklyMutation.isPending} style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>
                {submitWeeklyMutation.isPending ? <Loader2 size={16} className="spin" /> : <FileText size={16} />} 
                {submitWeeklyMutation.isPending ? 'Syncing...' : 'Dispatch Weekly Sync'}
              </button>
            )}
          </div>
        </div>

        <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.5rem' }}>
           <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <Database size={18} style={{ color: 'var(--color-primary)' }} />
                 <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Intelligence Logs</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--color-surface-low)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Assigned Unit</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Period Signature</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Transmission Status</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsLoading && reportRows.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spin" size={24} style={{ opacity: 0.3 }} /></td></tr>
                    ) : visibleReports.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--color-surface-low)' }}>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{row.team}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-outline)', marginTop: '2px' }}>{row.labelOne}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ fontWeight: 700 }}>{row.periodKey}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>{row.title}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <Badge variant={row.status === 'Missing' ? 'error' : row.status === 'Submitted' ? 'warning' : 'success'}>
                            {row.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                          <button className="btn-ghost sm" style={{ color: 'var(--color-primary)' }}><Download size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {!reportsLoading && visibleReports.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}>
                         <EmptyState icon={Database} title="No logs detected" message="System has no records matching these filter signatures." />
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>

           <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '20px' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                 <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Protocol Archive (MOM)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--color-surface-low)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Protocol Title</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Transcribed By</th>
                      <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momsLoading && moms.length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spin" size={24} style={{ opacity: 0.3 }} /></td></tr>
                    ) : visibleMoms.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--color-surface-low)' }}>
                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{row.title}</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-outline)', marginTop: '2px' }}>{row.meetingDate} • {row.team}</div>
                        </td>
                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>{row.preparedBy}</td>
                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                          <Badge variant={row.status === 'Published' || row.status === 'Approved' ? 'success' : 'warning'}>
                            {row.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {!loading && visibleMoms.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '4rem' }}>
                         <p style={{ opacity: 0.5, fontSize: '0.875rem' }}>No archived protocols found.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
    </>
  );
};

export default ReportCenter;
