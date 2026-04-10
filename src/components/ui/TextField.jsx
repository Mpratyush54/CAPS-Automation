import React from 'react';

const TextField = ({ label, error, icon: Icon, type = 'text', ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      {label && <label className="input-label" style={{ margin: 0 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--color-outline)' }}>
            <Icon size={18} />
          </div>
        )}
        <input 
          className="input-field" 
          type={type} 
          style={{ 
            paddingLeft: Icon ? '2.75rem' : '1rem',
            border: error ? '1px solid var(--color-error)' : '1px solid var(--color-outline-variant)'
          }} 
          {...props} 
        />
      </div>
      {error && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
};

export default TextField;
