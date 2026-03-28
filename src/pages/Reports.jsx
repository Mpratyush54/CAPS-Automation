import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Clock, CheckCircle2, Info, ChevronDown } from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuthStore } from '../store/auth';
import { ROLES } from '../rbac';

const TEAM_STATS = {
  'Tech Wing': {
    kpi: { hours: '390', logs: '102', events: '3', efficiency: '91%' },
    weekly: [
      { week: 'W1', hours: 86, logs: 22 }, { week: 'W2', hours: 104, logs: 28 },
      { week: 'W3', hours: 78, logs: 18 }, { week: 'W4', hours: 122, logs: 34 },
    ],
    pie: [{ name: 'Dev Board', value: 38 }, { name: 'QA Committee', value: 28 }, { name: 'Infra Team', value: 34 }],
    monthly: [180, 210, 165, 225, 200, 240],
    relatedLabels: ['Dev Board', 'QA Committee', 'Infra Team'],
  },
  'Community Wing': {
    kpi: { hours: '312', logs: '76', events: '4', efficiency: '76%' },
    weekly: [
      { week: 'W1', hours: 68, logs: 16 }, { week: 'W2', hours: 84, logs: 22 },
      { week: 'W3', hours: 72, logs: 18 }, { week: 'W4', hours: 88, logs: 20 },
    ],
    pie: [{ name: 'Events Comm.', value: 42 }, { name: 'Outreach Team', value: 35 }, { name: 'Media Cell', value: 23 }],
    monthly: [150, 180, 140, 195, 175, 210],
    relatedLabels: ['Events Comm.', 'Outreach Team', 'Media Cell'],
  },
  'Health Wing': {
    kpi: { hours: '224', logs: '55', events: '2', efficiency: '83%' },
    weekly: [
      { week: 'W1', hours: 50, logs: 12 }, { week: 'W2', hours: 64, logs: 16 },
      { week: 'W3', hours: 48, logs: 10 }, { week: 'W4', hours: 62, logs: 17 },
    ],
    pie: [{ name: 'Health Comm.', value: 55 }, { name: 'Wellness Team', value: 45 }],
    monthly: [120, 140, 110, 155, 140, 165],
    relatedLabels: ['Health Comm.', 'Wellness Team'],
  },
  'HR Wing': {
    kpi: { hours: '132', logs: '32', events: '1', efficiency: '92%' },
    weekly: [
      { week: 'W1', hours: 28, logs: 7 }, { week: 'W2', hours: 36, logs: 9 },
      { week: 'W3', hours: 30, logs: 8 }, { week: 'W4', hours: 38, logs: 8 },
    ],
    pie: [{ name: 'Vol. Affairs', value: 55 }, { name: 'Training Cell', value: 45 }],
    monthly: [80, 95, 70, 105, 90, 110],
    relatedLabels: ['Vol. Affairs', 'Training Cell'],
  },
};

const ORG_GLOBAL = {
  kpi: { hours: '1310', logs: '320', events: '10', efficiency: '87%' },
  weekly: [
    { week: 'W1', hours: 290, logs: 68 }, { week: 'W2', hours: 360, logs: 88 },
    { week: 'W3', hours: 240, logs: 54 }, { week: 'W4', hours: 420, logs: 110 },
  ],
  pie: Object.entries(TEAM_STATS).map(([name, d]) => ({ name, value: Math.round(parseInt(d.kpi.hours, 10) / 13.1) })),
  monthly: [530, 625, 485, 680, 605, 725],
};

const CONTRIBUTION_ROWS = [
  { id: 1, volunteer: 'Riya Gupta', labelOne: 'Tech Wing', labelTwo: 'Dev Board', hours: 31, logs: 19 },
  { id: 2, volunteer: 'Rahul Sharma', labelOne: 'Tech Wing', labelTwo: 'Dev Board', hours: 24, logs: 15 },
  { id: 3, volunteer: 'Asha Menon', labelOne: 'Health Wing', labelTwo: 'Health Comm.', hours: 37, logs: 22 },
  { id: 4, volunteer: 'Farhan Ali', labelOne: 'Community Wing', labelTwo: 'Outreach Team', hours: 9, logs: 8 },
];

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
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown size={13} style={{ position: 'absolute', right: '0.5rem', color: 'var(--color-outline)', pointerEvents: 'none' }} />
  </div>
);

const exportCSV = (data, filename = 'report.csv') => {
  if (!data.weekly?.length) return;
  const headers = Object.keys(data.weekly[0]).join(',');
  const rows = data.weekly.map((r) => Object.values(r).join(',')).join('\n');
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const KpiCards = ({ kpi, label }) => (
  <div className="grid-cols-4" style={{ marginBottom: '1.25rem' }}>
    {[
      { title: `${label} Hours`, value: kpi.hours, icon: Clock, up: true },
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
  const { role } = useAuthStore();
  const isTeamLead = role === ROLES.TEAM_LEAD;
  const isAdmin = role === ROLES.ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const labelOneOptions = isTeamLead ? ['Tech Wing'] : Object.keys(TEAM_STATS);
  const [selectedLabelOne, setSelectedLabelOne] = useState(labelOneOptions[0]);
  const labelOneData = TEAM_STATS[selectedLabelOne] || TEAM_STATS['Tech Wing'];

  const [selectedLabelTwo, setSelectedLabelTwo] = useState('All');
  const labelTwoOptions = ['All', ...(labelOneData.relatedLabels || [])];
  const [viewMode, setViewMode] = useState('Global');

  const activeData = isSuperAdmin && viewMode === 'Global' ? ORG_GLOBAL : labelOneData;
  const activeLabelTwo = selectedLabelTwo === 'All' ? (labelOneData.relatedLabels?.[0] || 'All') : selectedLabelTwo;
  const scopeLabel = isSuperAdmin && viewMode === 'Global'
    ? 'Organization'
    : isTeamLead
    ? `${selectedLabelOne} · ${activeLabelTwo}`
    : selectedLabelOne;

  const pageTitle = isTeamLead ? 'Team Stats' : isAdmin ? 'Team Label Stats' : 'Global Stats';
  const monthlyChartData = MONTHS.map((m, i) => ({ month: m, v: activeData.monthly?.[i] || 0 }));
  const visibleContributors = isSuperAdmin
    ? CONTRIBUTION_ROWS
    : isAdmin
    ? CONTRIBUTION_ROWS.filter((row) => row.labelOne === selectedLabelOne)
    : CONTRIBUTION_ROWS.filter((row) => row.labelTwo === activeLabelTwo);

  return (
    <>
      <TopBar title={pageTitle} />
      <div className="page-body">
        <div className="card" style={{ marginBottom: '1rem', background: 'var(--color-surface-low)' }}>
          <div className="card-meta-row" style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Stats treats wing and committee as two team labels. They are shown together for context, not as dependent levels.
          </div>
        </div>

        <div className="page-controls">
          {isSuperAdmin && (
            <div className="card-action-row">
              {['Global', 'Label 1'].map((m) => (
                <button key={m} className={`chip${viewMode === m ? ' active' : ''}`} onClick={() => setViewMode(m)}>{m} View</button>
              ))}
            </div>
          )}

          {(isAdmin || (isSuperAdmin && viewMode === 'Label 1') || isTeamLead) && (
            <Select value={selectedLabelOne} onChange={(v) => { setSelectedLabelOne(v); setSelectedLabelTwo('All'); }} options={labelOneOptions} />
          )}

          {(isAdmin || isTeamLead || (isSuperAdmin && viewMode === 'Label 1')) && (
            <Select value={selectedLabelTwo} onChange={setSelectedLabelTwo} options={labelTwoOptions} />
          )}

          <div className="card-action-row" style={{ marginLeft: 'auto', alignItems: 'center' }}>
            <div style={{ padding: '0.375rem 0.75rem', background: 'var(--color-primary-fixed)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Info size={12} /> {scopeLabel}
            </div>
            <button className="btn-secondary" onClick={() => exportCSV(activeData, `worklog-stats-${scopeLabel}.csv`)}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <KpiCards kpi={activeData.kpi} label={scopeLabel} />

        <div className="mobile-safe-grid" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: '1rem' }}>
          <div className="card chart-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>Hours and Logs - {scopeLabel}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={activeData.weekly}>
                <CartesianGrid vertical={false} stroke="var(--color-surface-high)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="hours" name="Hours" fill="var(--color-primary)" radius={[8, 8, 0, 0]} activeBar={{ fill: 'var(--color-primary-container)' }} />
                <Bar dataKey="logs" name="Logs" fill="var(--color-secondary-container)" radius={[8, 8, 0, 0]} activeBar={{ fill: '#8a72d8' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>
              {isSuperAdmin && viewMode === 'Global' ? 'Hours by Label 1' : 'Activity by Related Team Label'}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={activeData.pie} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="value">
                  {activeData.pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>6-Month Trend - {scopeLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid stroke="var(--color-surface-high)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="v" name="Hours" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 7, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {(isAdmin || isSuperAdmin) && (
          <div className="card table-card" style={{ marginTop: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
                {isAdmin ? 'Related Label Breakdown' : 'Label 1 Comparison'}
              </h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isAdmin ? 'Related Label' : 'Label 1'}</th>
                  <th>Hours</th>
                  <th>Logs</th>
                  <th>Events</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {isAdmin
                  ? (labelOneData.relatedLabels || []).map((label) => (
                      <tr key={label}>
                        <td style={{ fontWeight: 600 }}>{label}</td>
                        <td>{Math.round(parseInt(labelOneData.kpi.hours, 10) / labelOneData.relatedLabels.length)}h</td>
                        <td>{Math.round(parseInt(labelOneData.kpi.logs, 10) / labelOneData.relatedLabels.length)}</td>
                        <td>-</td>
                        <td><span className="badge badge-success">Active</span></td>
                      </tr>
                    ))
                  : Object.entries(TEAM_STATS).map(([name, d]) => (
                      <tr key={name}>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td>{d.kpi.hours}h</td>
                        <td>{d.kpi.logs}</td>
                        <td>{d.kpi.events}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--color-surface-high)', borderRadius: '9999px' }}>
                              <div style={{ width: d.kpi.efficiency, height: '100%', background: 'var(--gradient-primary)', borderRadius: '9999px' }} />
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', minWidth: '2.5rem' }}>{d.kpi.efficiency}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {(isAdmin || isSuperAdmin) && (
          <div className="card table-card" style={{ marginTop: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>Contribution Tracker</h3>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                Volunteer effort is shown against both team labels without assuming one label is inside the other.
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Label 1</th>
                  <th>Label 2</th>
                  <th>Hours</th>
                  <th>Logs</th>
                </tr>
              </thead>
              <tbody>
                {visibleContributors.map((row) => (
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
        )}
      </div>
    </>
  );
};

export default Reports;
