/**
 * =============================================================================
 * PROJECTSLISTSKELETON.JSX - Projects List Loading Skeleton
 * =============================================================================
 *
 * View-aware skeleton for ProjectsList. Supports both grid and list view modes
 * to prevent CLS when data loads. Also reserves space for the Favorites section.
 */

import { Skeleton } from '../../../components/ui/Skeleton';

/**
 * Grid card skeleton (~180px height)
 * Matches ProjectCard layout in grid view
 */
function ProjectCardSkeleton() {
  return (
    <div className="bg-panel border border-border rounded-xl p-4 h-[180px]">
      {/* Header: color dot + title */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-3 h-3 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      {/* Description lines */}
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
      {/* Footer: task count + due date */}
      <div className="flex gap-3 mt-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * List row skeleton (~48px height)
 * Matches ProjectCard compact layout in list view
 * Uses bg-bg without borders to match actual compact ProjectCard styling
 */
function ProjectRowSkeleton() {
  return (
    <div className="bg-bg rounded-xl p-3 h-[48px] flex items-center gap-3">
      <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-12 ml-auto" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

/**
 * Favorites section skeleton
 * Shows when user has favorited projects
 */
function FavoritesSectionSkeleton({ viewMode }) {
  return (
    <div className="mb-6">
      {/* Section header: star icon + "Favorites" */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map(i => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {[1, 2].map(i => <ProjectRowSkeleton key={i} />)}
        </div>
      )}
    </div>
  );
}

/**
 * All Projects section skeleton
 */
function AllProjectsSkeleton({ viewMode, showHeader = false }) {
  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-24" />
        </div>
      )}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => <ProjectRowSkeleton key={i} />)}
        </div>
      )}
    </div>
  );
}

/**
 * ProjectsListSkeleton
 *
 * View-aware skeleton that matches the actual ProjectsList layout.
 * Renders different skeletons based on viewMode (grid or list).
 *
 * @param {Object} props
 * @param {string} props.viewMode - 'grid' or 'list'
 * @param {boolean} props.showFavorites - Whether to show favorites section placeholder
 */
export default function ProjectsListSkeleton({ viewMode = 'grid', showFavorites = false }) {
  return (
    <div className="space-y-6">
      {showFavorites && <FavoritesSectionSkeleton viewMode={viewMode} />}
      <AllProjectsSkeleton viewMode={viewMode} showHeader={showFavorites} />
    </div>
  );
}

// Export individual components for reuse
export { ProjectCardSkeleton, ProjectRowSkeleton };
