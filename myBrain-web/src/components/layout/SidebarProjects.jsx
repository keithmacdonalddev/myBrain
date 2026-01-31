import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

/**
 * SidebarProjects - V2 Sidebar section showing recent/active projects
 *
 * Displays up to 4 projects with:
 * - Color dot indicator
 * - Project name
 * - Progress percentage (based on completed/total tasks)
 *
 * Matches the V2 dashboard prototype design.
 */
export default function SidebarProjects({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isV2 = useFeatureFlag('dashboardV2Enabled');

  // Fetch active projects, sorted by last modified
  const { data } = useProjects({ status: 'active' });
  const allProjects = data?.projects || [];

  // Get up to 4 most recent active projects and detect active project from URL
  const { displayProjects, hasMore, activeProjectId } = useMemo(() => {
    // Sort by last modified (most recent first)
    const sorted = [...allProjects].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA;
    });

    // Extract active project ID from URL
    const match = location.pathname.match(/\/app\/projects\/([a-f0-9]+)/i);
    const currentId = match ? match[1] : null;

    return {
      displayProjects: sorted.slice(0, 4),
      hasMore: sorted.length > 4,
      activeProjectId: currentId
    };
  }, [allProjects, location.pathname]);

  /**
   * Calculate progress percentage from project's task counts
   * Projects have a progress object with { completed, total }
   */
  const getProgressPercent = (project) => {
    if (project.progress?.total > 0) {
      return Math.round((project.progress.completed / project.progress.total) * 100);
    }
    return 0;
  };

  const handleProjectClick = (projectId) => {
    navigate(`/app/projects/${projectId}`);
  };

  // Hide section when collapsed or no projects
  if (collapsed || displayProjects.length === 0) {
    return null;
  }

  // V2 styling uses CSS variables for consistent colors
  const sectionTitleClass = isV2
    ? 'text-[11px] font-semibold uppercase tracking-wider text-[var(--v2-text-tertiary)] mb-2'
    : 'text-xs font-semibold text-muted uppercase tracking-wider mb-2';

  const projectItemClass = isV2
    ? 'w-full flex items-center gap-3 px-3 py-2 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-[var(--v2-separator)]'
    : 'w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-panel';

  const projectItemActiveClass = isV2
    ? 'w-full flex items-center gap-3 px-3 py-2 rounded-[10px] cursor-pointer transition-all duration-200 bg-[rgba(59,130,246,0.1)] text-[var(--v2-accent-primary)]'
    : 'w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer bg-primary/10 text-primary';

  const projectNameClass = isV2
    ? 'flex-1 text-sm text-[var(--v2-text-primary)] truncate text-left'
    : 'flex-1 text-sm text-text truncate text-left';

  const projectProgressClass = isV2
    ? 'text-xs text-[var(--v2-text-tertiary)] flex-shrink-0'
    : 'text-xs text-muted flex-shrink-0';

  const viewAllClass = isV2
    ? 'w-full px-3 py-2 mt-1 text-xs text-[var(--v2-text-secondary)] text-left bg-transparent border border-[var(--v2-separator)] rounded-md cursor-pointer transition-all duration-200 hover:bg-[var(--v2-separator)] hover:text-[var(--v2-text-primary)]'
    : 'w-full px-3 py-2 mt-1 text-xs text-muted text-left bg-transparent border border-border rounded cursor-pointer transition-colors hover:bg-panel hover:text-text';

  return (
    <div className="pt-4">
      {/* Section Title */}
      <p className={`px-3 ${sectionTitleClass}`}>Projects</p>

      {/* Project List */}
      <div className="space-y-0.5 px-1">
        {displayProjects.map(project => {
          const isActive = activeProjectId === project._id;
          const progress = getProgressPercent(project);

          return (
            <button
              key={project._id}
              onClick={() => handleProjectClick(project._id)}
              className={isActive ? projectItemActiveClass : projectItemClass}
            >
              {/* Color Dot */}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || '#007AFF' }}
              />
              {/* Project Name */}
              <span className={projectNameClass}>
                {project.title}
              </span>
              {/* Progress Percentage */}
              <span className={projectProgressClass}>
                {progress}%
              </span>
            </button>
          );
        })}
      </div>

      {/* View All Button */}
      {hasMore && (
        <div className="px-1 mt-1">
          <button
            onClick={() => navigate('/app/projects')}
            className={viewAllClass}
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
}
