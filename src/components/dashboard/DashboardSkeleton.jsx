import { Skeleton, SkeletonText, SkeletonTitle, SkeletonAvatar } from '../Skeleton';

const DashboardSkeleton = () => (
  <div className="stack-gap-1">
    <div className="grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Skeleton style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem' }} />
          <div style={{ flex: 1 }}>
            <SkeletonTitle width="40%" />
            <SkeletonText width="60%" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid-sidebar-right">
      <div className="card">
        <SkeletonTitle />
        <div className="stack-gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0' }}>
              <SkeletonAvatar />
              <div style={{ flex: 1 }}>
                <SkeletonText width="80%" />
                <SkeletonText width="40%" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <Skeleton style={{ height: '180px', width: '100%' }} />
      </div>
    </div>
  </div>
);

export default DashboardSkeleton;
