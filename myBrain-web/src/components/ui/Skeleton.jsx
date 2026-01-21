/**
 * Skeleton loading component
 *
 * Usage:
 * <Skeleton className="w-32 h-4" /> - Single line
 * <Skeleton className="w-full h-20" /> - Block
 * <Skeleton.Text lines={3} /> - Multiple text lines
 * <Skeleton.Avatar /> - Circle avatar
 * <Skeleton.Card /> - Full card skeleton
 */

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`skeleton rounded ${className}`}
      {...props}
    />
  );
}

// Text skeleton with multiple lines
Skeleton.Text = function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

// Avatar skeleton (circle)
Skeleton.Avatar = function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton className={`rounded-full ${sizeClasses[size]} ${className}`} />
  );
};

// Card skeleton
Skeleton.Card = function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-panel border border-border rounded-lg p-4 shadow-theme-card ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton.Avatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton.Text lines={2} />
    </div>
  );
};

// Note card skeleton
Skeleton.NoteCard = function SkeletonNoteCard({ className = '' }) {
  return (
    <div className={`bg-panel border border-border rounded-lg p-4 shadow-theme-card ${className}`}>
      <Skeleton className="h-5 w-3/4 mb-3" />
      <Skeleton.Text lines={2} className="mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
};

// Table row skeleton
Skeleton.TableRow = function SkeletonTableRow({ columns = 4, className = '' }) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-10' : 'flex-1'}`}
        />
      ))}
    </div>
  );
};

// List skeleton
Skeleton.List = function SkeletonList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton.Avatar size="sm" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/3 mb-1" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
