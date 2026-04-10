import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PlusCircle, Calendar } from 'lucide-react';
import KpiGrid from './KpiGrid';

// UI Components
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

const VolunteerDashboard = ({ data }) => (
  <div className="stack-gap-1">
    <KpiGrid items={data.kpis} columns={3} />
    
    <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="card-flex-between" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Assigned Missions</h3>
          <Badge variant="neutral">
            {data?.myTasks?.length || 0} Required
          </Badge>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(data?.myTasks || []).map((task) => (
            <div key={task.id} style={{ 
              display: 'flex', gap: '1rem', padding: '1rem', 
              background: 'var(--color-surface-low)', borderRadius: '12px',
              borderLeft: task.status === 'In Progress' ? '4px solid var(--color-primary)' : '4px solid var(--color-outline-variant)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>{task.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.6 }}>
                  <Calendar size={12} />
                  <span>Due {task.deadline}{task.eventTitle ? ` · ${task.eventTitle}` : ''}</span>
                </div>
              </div>
              <Badge variant={task.status === 'In Progress' ? 'primary' : 'neutral'}>{task.status}</Badge>
            </div>
          ))}
          {(!data?.myTasks || data.myTasks.length === 0) && (
            <EmptyState 
              icon={PlusCircle} 
              title="No missions active" 
              message="Check the Event Board to join new missions." 
            />
          )}
        </div>
      </div>

      <div className="card" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', textAlign: 'center', 
        background: 'var(--gradient-primary)', color: '#fff', 
        padding: '2rem', gap: '1.25rem' 
      }}>
        <div style={{ 
          width: '3.5rem', height: '3.5rem', background: 'rgba(255,255,255,0.2)', 
          borderRadius: '1rem', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
        }}>
          <PlusCircle size={28} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem' }}>Sync Progress</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>Documentation of your activity is required.</p>
        </div>
        <a href="/logs" className="btn-secondary" style={{ 
          background: 'var(--color-surface-lowest)', color: 'var(--color-primary)', 
          border: 'none', width: '100%', justifyContent: 'center' 
        }}>+ Document Activity</a>
      </div>
    </div>

    <div className="card" style={{ padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 800 }}>Weekly Impact Velocity</h3>
      <div style={{ height: '200px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weeklyHoursChart}>
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
              cursor={{ fill: 'var(--color-surface-low)' }}
              contentStyle={{ 
                background: 'var(--color-surface-lowest)', 
                border: 'none', borderRadius: '12px', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
                fontSize: '0.8125rem' 
              }} 
            />
            <Bar dataKey="hours" name="Hours" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export default VolunteerDashboard;
