import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const KpiCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = { isUp: true, label: 'Current period' },
  style = {}
}) => {
  return (
    <div className="card" style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span className="card-title" style={{ margin: 0 }}>{title}</span>
        {Icon && <Icon size={13} style={{ color: trend.isUp ? '#059669' : 'var(--color-error)' }} />}
      </div>
      <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em' }}>
        {value}
      </p>
      <span style={{ fontSize: '0.75rem', color: trend.isUp ? '#059669' : 'var(--color-error)', fontWeight: 600 }}>
        {trend.isUp ? (
          <TrendingUp size={10} style={{ display: 'inline', marginRight: 2 }} />
        ) : (
          <TrendingDown size={10} style={{ display: 'inline', marginRight: 2 }} />
        )}
        {trend.label}
      </span>
    </div>
  );
};

export default KpiCard;
