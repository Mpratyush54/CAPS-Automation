import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Clock, CheckCircle2, Info, ChevronDown, AlertCircle } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';
import { api, getErrorMessage, unwrap } from '../lib/api';

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const COLORS = ['#4343d5', '#674db0', '#b095ff', '#dde1ff', '#6a7091', '#525877'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-surface-lowest)', borderRadius: '0.5rem', padding: '0.75rem', boxShadow: 'var(--shadow-card)', fontSize: '0.8125rem' }}>
      <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: 0, color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

const Select = ({ value, onChange, options }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: '11rem', maxWidth: '100%' }}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none', background: 'var(--color-surface-lowest)', border: '1.5px solid var(--color-surface-high)',
        borderRadius: '0.5rem', padding: '0.4375rem 2rem 0.4375rem 0.75rem', fontSize: '0.8125rem',
        fontFamily: 'Inter, sans-serif', color: 'var(--color-on-surface)', cursor: 'pointer', fontWeight: 500, width: '100%',
      }}
    >
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
    <ChevronDown size={13} style={{ position: 'absolute', right: '0.5rem', color: 'var(--color-outline)', pointerEvents: 'none' }} />
  </div>
);

const KpiCards = ({ kpi, label }) => (
  <div className="grid-cols-4" style={{ marginBottom: '1.25rem' }}>
    {[
      { title: `Total Hours`, value: kpi.hours, icon: Clock, up: true },
      { title: 'Logs Submitted', value: kpi.logs, icon: CheckCircle2, up: true },
      { title: 'Events', value: kpi.events, icon: CheckCircle2, up: true },
      { title: 'Efficiency', value: kpi.efficiency, icon: TrendingUp, up: parseInt(kpi.efficiency, 10) >= 80 },
    ].map(({ title, value, icon: Icon, up }) => (
      <div key={title} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="card-title" style={{ margin: 0 }}>{title}</span>
          <Icon size={13} style={{ color: up ? '#059669' : 'var(--color-error)' }} />
        </div>
        <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em' }}>{value}</p>
        <span style={{ fontSize: '0.75rem', color: up ? '#059669' : 'var(--color-error)', fontWeight: 600 }}>
          {up ? <TrendingUp size={10} style={{ display: 'inline', marginRight: 2 }} /> : <TrendingDown size={10} style={{ display: 'inline', marginRight: 2 }} />}
          Current period
        </span>
      </div>
    ))}
  </div>
);

const Reports = () => {
  const { role, user } = useAuthStore();
  const [wings, setWings] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedWing, setSelectedWing] = useState(user?.primaryWingId || '');
  const [selectedCommittee, setSelectedCommittee] = useState(user?.primaryCommitteeId || '');
  const [viewMode, setViewMode] = useState(role === ROLES.SUPER_ADMIN ? 'Global' : 'Label 1');
  
  const [statsData, setStatsData] = useState({
    kpi: { hours: '0', logs: '0', events: '0', efficiency: '0%' },
    weekly: [],
    pie: [],
    monthly: [],
  });
  const [breakdownRows, setBreakdownRows] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [wRes, cRes] = await Promise.all([
          api.get('/api/organization/wings'),
          api.get('/api/organization/committees')
        ]);
        const wData = unwrap(wRes);
        const cData = unwrap(cRes);
        setWings(wData.rows || []);
        setCommittees(cData.rows || []);
      } catch (e) {
        console.error('Failed to load organization scope', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      setLoading(true);
      try {
        const view = viewMode === 'Global' ? 'global' : (selectedCommittee ? 'team' : 'wing');
        const [overviewRes, breakdownRes, contribRes] = await Promise.all([
          api.get('/api/stats/overview', { params: { view, labelOneId: selectedWing, labelTwoId: selectedCommittee } }),
          api.get('/api/stats/breakdown', { params: { view: view === 'global' ? 'global-label-one' : 'admin-related-labels', labelOneId: selectedWing } }),
          api.get('/api/stats/contributions', { params: { labelOneId: selectedWing, labelTwoId: selectedCommittee } })
        ]);
        if (!mounted) return;
        setStatsData(unwrap(overviewRes));
        setBreakdownRows(unwrap(breakdownRes).rows || []);
        setContributions(unwrap(contribRes).rows || []);
        setError(null);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load report data.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadStats();
    return () => { mounted = false; };
  }, [viewMode, selectedWing, selectedCommittee]);

  const pageTitle = role === ROLES.TEAM_LEAD ? 'Team Stats' : role === ROLES.ADMIN ? 'Wing Analytics' : 'Organization Dashboard';
  const monthlyChartData = MONTHS.map((m, i) => ({ month: m, v: statsData.monthly?.[i] || 0 }));

  if (loading && statsData.weekly.length === 0) {
    return (
      <>
        <TopBar title={pageTitle} />
        <div className="page-body"><div className="card">Loading analytics...</div></div>
      </>
    );
  }

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="page-controls">
          {role === ROLES.SUPER_ADMIN && (
            <div className="card-action-row">
              {['Global', 'Label 1'].map((m) => (
                <button key={m} className={`chip${viewMode === m ? ' active' : ''}`} onClick={() => setViewMode(m)}>{m} View</button>
              ))}
            </div>
          )}

          {(viewMode === 'Label 1' || role !== ROLES.SUPER_ADMIN) && (
            <Select value={selectedWing} onChange={setSelectedWing} options={[{ id: '', name: 'Select Wing' }, ...wings]} />
          )}

          {selectedWing && (
            <Select value={selectedCommittee} onChange={setSelectedCommittee} options={[{ id: '', name: 'All Committees' }, ...committees.filter(c => String(c.wingId) === String(selectedWing))]} />
          )}

          <div className="card-action-row" style={{ marginLeft: 'auto', alignItems: 'center' }}>
            <button className="btn-secondary">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <KpiCards kpi={statsData.kpi} label={statsData.scopeLabel} />

        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: '1rem' }}>
          <div className="card chart-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Weekly Engagement</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statsData.weekly}>
                <CartesianGrid vertical={false} stroke="var(--color-surface-high)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="hours" name="Hours" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="logs" name="Logs" fill="var(--color-secondary-container)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Active Distribution (%)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statsData.pie} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="value">
                  {statsData.pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>6-Month Output Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid stroke="var(--color-surface-high)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="v" name="Hours" stroke="var(--color-primary)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card table-card" style={{ marginTop: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Breakdown Analysis</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Entity</th><th>Hours</th><th>Logs</th><th>Efficiency</th></tr>
            </thead>
            <tbody>
              {breakdownRows.map((row) => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td>{row.hours}h</td>
                  <td>{row.logs}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--color-surface-high)', borderRadius: '9999px' }}>
                        <div style={{ width: row.efficiency, height: '100%', background: 'var(--gradient-primary)', borderRadius: '9999px' }} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>{row.efficiency}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card table-card" style={{ marginTop: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Contribution Registry</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Volunteer</th><th>Wing</th><th>Committee</th><th>Hours</th><th>Logs</th></tr>
            </thead>
            <tbody>
              {contributions.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.volunteer}</td>
                  <td>{row.labelOne}</td>
                  <td>{row.labelTwo}</td>
                  <td>{row.hours}h</td>
                  <td>{row.logs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Reports;
