import { CheckCircle2, Circle } from 'lucide-react';

export function ProjectProgress({ progress, size = 'md', showLabel = true }) {
  if (!progress) {
    return null;
  }

  const { total, completed, percentage } = progress;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage === 100) return 'bg-success';
    if (percentage >= 75) return 'bg-success/80';
    if (percentage >= 50) return 'bg-primary';
    if (percentage >= 25) return 'bg-warning';
    return 'bg-muted';
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className={`flex items-center justify-between mb-1 ${textSizes[size]}`}>
          <span className="text-muted flex items-center gap-1">
            {percentage === 100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
            {completed} of {total} tasks
          </span>
          <span className="text-text font-medium">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-border rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${getProgressColor()} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProjectProgress;
