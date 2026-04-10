import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

const Alert = ({ 
  children, 
  variant = 'error', 
  style = {} 
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'var(--color-success-container)',
          text: 'var(--color-on-success-container)',
          icon: <CheckCircle size={14} />
        };
      case 'warning':
        return {
          bg: 'var(--color-warning-container)',
          text: 'var(--color-on-warning-container)',
          icon: <AlertCircle size={14} />
        };
      case 'info':
        return {
          bg: 'var(--color-info-container)',
          text: 'var(--color-on-info-container)',
          icon: <Info size={14} />
        };
      default: // error
        return {
          bg: 'var(--color-error-container)',
          text: 'var(--color-on-error-container)',
          icon: <AlertCircle size={14} />
        };
    }
  };

  const colors = getColors();

  return (
    <div 
      style={{ 
        marginBottom: '1rem', 
        padding: '0.75rem 1rem', 
        borderRadius: '0.625rem', 
        background: colors.bg, 
        color: colors.text, 
        fontSize: '0.8125rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        ...style 
      }}
    >
      {colors.icon}
      <span>{children}</span>
    </div>
  );
};

export default Alert;
