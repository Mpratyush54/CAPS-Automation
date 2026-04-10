import React from 'react';
import { Info } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = Info, 
  title, 
  message, 
  style = {} 
}) => {
  return (
    <div 
      className="card" 
      style={{ 
        textAlign: 'center', 
        padding: '4rem 2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        ...style 
      }}
    >
      <Icon 
        size={32} 
        style={{ 
          color: 'var(--color-outline)', 
          marginBottom: '1rem' 
        }} 
      />
      {title && (
        <p style={{ margin: 0, fontWeight: 600 }}>
          {title}
        </p>
      )}
      {message && (
        <p 
          style={{ 
            margin: '0.5rem 0 0', 
            fontSize: '0.875rem', 
            color: 'var(--color-on-surface-variant)' 
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default EmptyState;
