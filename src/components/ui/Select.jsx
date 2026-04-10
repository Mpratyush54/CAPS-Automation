import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select option",
  containerStyle = {},
  selectStyle = {}
}) => {
  return (
    <div 
      style={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center', 
        minWidth: '11rem', 
        maxWidth: '100%',
        ...containerStyle 
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', 
          background: 'var(--color-surface-lowest)', 
          border: '1.5px solid var(--color-surface-high)',
          borderRadius: '0.5rem', 
          padding: '0.4375rem 2rem 0.4375rem 0.75rem', 
          fontSize: '0.8125rem',
          fontFamily: 'Inter, sans-serif', 
          color: 'var(--color-on-surface)', 
          cursor: 'pointer', 
          fontWeight: 500, 
          width: '100%',
          ...selectStyle
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          typeof o === 'string' 
            ? <option key={o} value={o}>{o}</option> 
            : <option key={o.id} value={o.id}>{o.name || o.label}</option>
        ))}
      </select>
      <ChevronDown 
        size={13} 
        style={{ 
          position: 'absolute', 
          right: '0.75rem', 
          color: 'var(--color-outline)', 
          pointerEvents: 'none' 
        }} 
      />
    </div>
  );
};

export default Select;
