import { Target } from 'lucide-react';
import { useProjects } from '../../projects/hooks/useProjects';

// Goal progress colors - data visualization colors for distinguishing multiple goals
// These remain as hex values since they're used for chart-like data visualization
const GOAL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316'];

export default function GoalsWidget() {
  const { data, isLoading } = useProjects({ isGoal: true, status: 'active' });
  const goals = data?.projects || [];

  if (isLoading) {
    return (
      <div className="dash-widget">
        <div className="dash-widget-header">
          <div className="dash-widget-title">
            <span className="dash-widget-icon" style={{ background: 'var(--primary-bg, rgba(59,130,246,0.12))', color: 'var(--primary)' }}>
              <Target className="w-4 h-4" />
            </span>
            <span>Goals</span>
          </div>
        </div>
        <div className="dash-widget-body">
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-panel2 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon" style={{ background: 'var(--primary-bg, rgba(59,130,246,0.12))', color: 'var(--primary)' }}>
            <Target className="w-4 h-4" />
          </span>
          <span>Goals</span>
          {goals.length > 0 && <span className="dash-widget-count">{goals.length} active</span>}
        </div>
      </div>
      <div className="dash-widget-body">
        {goals.length === 0 ? (
          <div className="dash-widget-empty-sm">No active goals. Mark a project as a goal to track it here.</div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, idx) => {
              const pct = goal.progress?.percentage || 0;
              const color = GOAL_COLORS[idx % GOAL_COLORS.length];
              return (
                <div key={goal._id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text truncate mr-2">{goal.title}</span>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
