import React from 'react';

const Badge = ({ children, variant = 'neutral', fontWeight = 400, style = {} }) => {
  const getBadgeClass = () => {
    switch (variant) {
      case 'primary': return 'badge-primary';
      case 'secondary': return 'badge-secondary';
      case 'success': return 'badge-success';
      case 'error': return 'badge-error';
      case 'warning': return 'badge-warning';
      case 'info': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  return (
    <span 
      className={`badge ${getBadgeClass()}`} 
      style={{ fontWeight, ...style }}
    >
      {children}
    </span>
  );
};

export default Badge;
