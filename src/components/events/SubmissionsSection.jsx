import React from 'react';

const SubmissionsSection = ({ summary }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
      <section>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 600 }}>People-wise Submissions</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.8125rem', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-surface-high)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Role</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Team</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Photos</th>
              </tr>
            </thead>
            <tbody>
              {summary.people.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-low)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{p.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{p.role}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{p.teamName}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{p.count}</td>
                </tr>
              ))}
              {summary.people.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                    No submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 600 }}>Team-wise Analytics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {summary.teams.map((t, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--color-surface-low)', border: 'none' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>{t.count}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Photos</div>
            </div>
          ))}
          {summary.teams.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1', opacity: 0.5 }}>
              No team data available
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SubmissionsSection;
