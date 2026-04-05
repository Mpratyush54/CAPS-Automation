import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => (
  <div className={`skeleton ${className}`} style={style} />
);

export const SkeletonText = ({ className = '', width = '100%', height, style = {} }) => (
  <Skeleton className={`skeleton-text ${className}`} style={{ width, height, ...style }} />
);

export const SkeletonTitle = ({ className = '', width = '60%', height, style = {} }) => (
  <Skeleton className={`skeleton-title ${className}`} style={{ width, height, ...style }} />
);

export const SkeletonAvatar = ({ className = '', size = '2.5rem', style = {} }) => (
  <Skeleton className={`skeleton-avatar ${className}`} style={{ width: size, height: size, ...style }} />
);

export const SkeletonButton = ({ className = '', style = {} }) => (
  <Skeleton className={`skeleton-button ${className}`} style={style} />
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <>
    {[...Array(rows)].map((_, i) => (
      <tr key={i}>
        {[...Array(cols)].map((_, j) => (
          <td key={j}>
            <SkeletonText width={j === 0 ? '40%' : '80%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const CardSkeleton = ({ count = 3 }) => (
  <>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <SkeletonTitle />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonText width="90%" />
          <SkeletonText width="70%" />
          <SkeletonText width="80%" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <SkeletonButton style={{ flex: 1 }} />
          <SkeletonButton style={{ width: '40px' }} />
        </div>
      </div>
    ))}
  </>
);
