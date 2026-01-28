import { Clock, CheckCircle2, ListTodo, Calendar } from 'lucide-react';

function ProgressRing({ percentage = 0 }) {
  const radius = 40;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const size = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress circle */}
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={percentage === 100 ? 'text-green-500' : 'text-primary'}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="text-lg font-semibold text-text">{percentage}%</span>
      <span className="text-xs text-muted">Complete</span>
    </div>
  );
}

export function ProjectStatsSidebar({ project }) {
  if (!project) return null;

  const totalTasks = project.linkedTasks?.length || 0;
  const completedTasks = project.progress?.completed || 0;
  const inProgressTasks = project.linkedTasks?.filter(t => t.status === 'in_progress').length || 0;
  const percentage = project.progress?.percentage || 0;

  const daysRemaining = project.deadline
    ? Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const lastUpdated = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-panel border border-border rounded-xl p-4 space-y-6">
      {/* Progress Ring */}
      <div className="flex justify-center">
        <ProgressRing percentage={percentage} />
      </div>

      {/* Time Remaining */}
      <div className="flex items-center gap-3 px-2">
        <Clock className="w-4 h-4 text-muted flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-text">
            {daysRemaining === null
              ? 'No deadline'
              : daysRemaining < 0
                ? `${Math.abs(daysRemaining)} days overdue`
                : daysRemaining === 0
                  ? 'Due today'
                  : `${daysRemaining} days remaining`
            }
          </p>
          {project.deadline && (
            <p className="text-[10px] text-muted">
              {new Date(project.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Task Breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-text px-2">Task Breakdown</h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-bg">
            <div className="flex items-center gap-2">
              <ListTodo className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs text-text">Total</span>
            </div>
            <span className="text-xs font-medium text-text">{totalTasks}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-bg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-text">Completed</span>
            </div>
            <span className="text-xs font-medium text-green-500">{completedTasks}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-bg">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-text">In Progress</span>
            </div>
            <span className="text-xs font-medium text-blue-500">{inProgressTasks}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {lastUpdated && (
        <div className="flex items-center gap-3 px-2 pt-2 border-t border-border">
          <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
          <div>
            <p className="text-[10px] text-muted">Last updated</p>
            <p className="text-xs text-text">{lastUpdated}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectStatsSidebar;
