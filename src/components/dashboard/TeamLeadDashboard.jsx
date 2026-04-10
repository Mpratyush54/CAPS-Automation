import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import KpiGrid from './KpiGrid';

// UI Components
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

const TeamLeadDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={4} />

    <div className="grid-sidebar-right" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 800 }}>Unit Activity Stream</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data.teamLogsToday || []).map((log, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: '1rem', 
              padding: '0.875rem', background: 'var(--color-surface-low)', 
              borderRadius: '12px' 
            }}>
              <div style={{ 
                width: '2.5rem', height: '2.5rem', borderRadius: '50%', 
                background: 'var(--color-surface-lowest)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontWeight: 700, color: 'var(--color-primary)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                {log.member.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>{log.member}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.task}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge variant={log.status === 'Completed' ? 'success' : 'warning'}>{log.status}</Badge>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', fontWeight: 600, opacity: 0.5 }}>{log.time}</p>
              </div>
            </div>
          ))}
          {(!data.teamLogsToday || data.teamLogsToday.length === 0) && (
            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No activity logs found for today.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 800 }}>Unit Performance Velocity</h3>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.committeeHoursWeekChart}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-outline)' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-outline)' }} 
                axisLine={false} 
                tickLine={false} 
                width={30} 
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--color-surface-lowest)', 
                  border: 'none', borderRadius: '12px', 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
                  fontSize: '0.8125rem' 
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="var(--color-primary)" 
                strokeWidth={3} 
                dot={{ fill: 'var(--color-primary)', r: 4 }} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);

export default TeamLeadDashboard;
