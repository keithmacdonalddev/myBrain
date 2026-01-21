/**
 * =============================================================================
 * PROJECTSWIDGET.JSX - Active Projects Widget
 * =============================================================================
 *
 * Shows active projects with progress bars and task completion stats.
 *
 * SIZE: default (4 columns)
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { FolderKanban, ChevronRight, Calendar } from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetBadge
} from '../components/DashboardGrid';

/**
 * ProjectsWidget
 * --------------
 * @param {Array} projects - Active projects with task counts
 * @param {boolean} isLoading - Loading state
 * @param {Function} onProjectClick - Handler for project clicks
 */
export default function ProjectsWidget({
  projects = [],
  isLoading = false,
  onProjectClick
}) {
  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: 'text-danger' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-warning' };
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-warning' };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: 'text-muted' };

    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-muted'
    };
  };

  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<FolderKanban className="w-4 h-4 text-purple-500" />}
          iconBg="bg-purple-500/10"
          title="Active Projects"
        />
        <WidgetBody>
          <WidgetLoading />
        </WidgetBody>
      </>
    );
  }

  return (
    <>
      <WidgetHeader
        icon={<FolderKanban className="w-4 h-4 text-purple-500" />}
        iconBg="bg-purple-500/10"
        title="Active Projects"
        badge={projects.length > 0 && <WidgetBadge value={projects.length} variant="primary" />}
      />

      <WidgetBody>
        {projects.length === 0 ? (
          <WidgetEmpty
            icon={<FolderKanban className="w-8 h-8" />}
            title="No active projects"
            text="Create a project to track your goals."
          />
        ) : (
          <div className="space-y-2.5">
            {projects.slice(0, 4).map((project) => {
              const deadline = formatDeadline(project.deadline);
              const taskCounts = project.taskCounts || { total: 0, completed: 0 };
              const progress = taskCounts.total > 0
                ? Math.round((taskCounts.completed / taskCounts.total) * 100)
                : project.progress || 0;

              return (
                <div
                  key={project._id}
                  className="p-2.5 bg-bg rounded-lg cursor-pointer hover:border-primary/30 border border-transparent transition-all"
                  onClick={() => onProjectClick?.(project)}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {project.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <span className="font-medium text-sm text-text truncate">
                        {project.title}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-muted ml-2">
                      {progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Footer info */}
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {taskCounts.completed}/{taskCounts.total} tasks
                    </span>
                    {deadline && (
                      <span className={`flex items-center gap-1 ${deadline.color}`}>
                        <Calendar className="w-3 h-3" />
                        {deadline.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <Link to="/app/projects" className="widget-footer-link">
          View all projects <ChevronRight className="w-4 h-4" />
        </Link>
      </WidgetFooter>
    </>
  );
}

ProjectsWidget.defaultSize = 'default';
