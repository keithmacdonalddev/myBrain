import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, FolderKanban, Star, Archive } from 'lucide-react';
import { useProjects } from '../../features/projects/hooks/useProjects';

/**
 * SidebarSection - Renders a collapsible section within SidebarProjects
 */
function SidebarSection({
  icon: Icon,
  label,
  count,
  items,
  expanded,
  onToggle,
  showViewAll,
  viewAllPath,
  onItemClick,
  activeProjectId
}) {
  const navigate = useNavigate();

  if (count === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted hover:text-text hover:bg-panel transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left font-medium">{label}</span>
        <span className="text-[10px] text-muted">{count}</span>
      </button>

      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {items.map(project => {
            const isActive = activeProjectId === project._id;
            return (
              <button
                key={project._id}
                onClick={() => onItemClick(project._id)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                  isActive ? 'text-primary bg-primary/10' : 'text-text hover:bg-panel'
                }`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color || 'var(--primary)' }}
                />
                <span className="truncate flex-1 text-left">{project.title}</span>
                {project.progress?.total > 0 && (
                  <span className="text-[10px] text-muted flex-shrink-0">
                    {project.progress.completed}/{project.progress.total}
                  </span>
                )}
              </button>
            );
          })}
          {showViewAll && (
            <button
              onClick={() => navigate(viewAllPath)}
              className="w-full px-2 py-1 text-[10px] text-primary hover:underline text-left"
            >
              View all ({count})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SidebarProjects - Sidebar navigation for projects with Favorites, All, and Archive sections
 */
export default function SidebarProjects({ collapsed }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [favExpanded, setFavExpanded] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Fetch all projects to categorize them
  const { data } = useProjects();
  const allProjects = data?.projects || [];

  // Categorize projects
  const { favorites, active, archived, totalCount, activeProjectId } = useMemo(() => {
    const favs = allProjects.filter(p => p.favorited && p.status === 'active');
    const act = allProjects.filter(p => p.status === 'active' && !p.favorited);
    const arch = allProjects.filter(p => ['completed', 'on_hold', 'someday'].includes(p.status));
    const total = allProjects.length;

    // Extract active project ID from URL
    const match = location.pathname.match(/\/app\/projects\/([a-f0-9]+)/i);
    const currentId = match ? match[1] : null;

    return {
      favorites: favs,
      active: act,
      archived: arch,
      totalCount: total,
      activeProjectId: currentId
    };
  }, [allProjects, location.pathname]);

  const handleProjectClick = (projectId) => {
    navigate(`/app/projects/${projectId}`);
  };

  const showContent = !collapsed;

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{
        maxHeight: showContent ? '1000px' : '0px',
        opacity: showContent ? 1 : 0
      }}
    >
      <div className="px-3 py-1">
      {/* Main Projects header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted hover:text-text hover:bg-panel transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <FolderKanban className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Projects</span>
        <span className="text-xs text-muted">{totalCount}</span>
      </button>

      {isExpanded && totalCount > 0 && (
        <div className="ml-5 mt-0.5 border-l border-border pl-2">
          {/* Favorites section */}
          <SidebarSection
            icon={Star}
            label="Favorites"
            count={favorites.length}
            items={favorites}
            expanded={favExpanded}
            onToggle={() => setFavExpanded(!favExpanded)}
            showViewAll={false}
            onItemClick={handleProjectClick}
            activeProjectId={activeProjectId}
          />

          {/* All Projects section */}
          <SidebarSection
            icon={FolderKanban}
            label="All Projects"
            count={active.length}
            items={active.slice(0, 10)}
            expanded={allExpanded}
            onToggle={() => setAllExpanded(!allExpanded)}
            showViewAll={active.length > 10}
            viewAllPath="/app/projects?status=active"
            onItemClick={handleProjectClick}
            activeProjectId={activeProjectId}
          />

          {/* Archive section */}
          <SidebarSection
            icon={Archive}
            label="Archive"
            count={archived.length}
            items={archived.slice(0, 5)}
            expanded={archiveExpanded}
            onToggle={() => setArchiveExpanded(!archiveExpanded)}
            showViewAll={archived.length > 5}
            viewAllPath="/app/projects?status=archived"
            onItemClick={handleProjectClick}
            activeProjectId={activeProjectId}
          />

          {/* View all projects link */}
          {totalCount > 0 && (
            <button
              onClick={() => navigate('/app/projects')}
              className="w-full px-2 py-1.5 mt-1 text-[10px] text-primary hover:underline text-left"
            >
              View all projects
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
