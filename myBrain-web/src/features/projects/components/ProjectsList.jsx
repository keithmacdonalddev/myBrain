import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  FolderKanban,
  Clock,
  CheckCircle2,
  Pause,
  Archive,
  SortAsc,
  LayoutGrid,
  List,
  Star,
  AlertTriangle
} from 'lucide-react';
import MobilePageHeader from '../../../components/layout/MobilePageHeader';
import TabNav from '../../../components/ui/TabNav';
import ProjectsListSkeleton from './ProjectsListSkeleton';
import { useProjects } from '../hooks/useProjects';
import { useLifeAreas } from '../../lifeAreas/hooks/useLifeAreas';
import { ProjectCard } from './ProjectCard';
import { useProjectPanel } from '../../../contexts/ProjectPanelContext';
import { usePageTracking } from '../../../hooks/useAnalytics';

const STATUS_FILTERS = [
  { id: 'all', label: 'All', icon: FolderKanban },
  { id: 'active', label: 'Active', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'on_hold', label: 'On Hold', icon: Pause },
  { id: 'someday', label: 'Someday', icon: Archive },
];

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'updatedAt', label: 'Recently Updated' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
];

export function ProjectsList() {
  const { openNewProject } = useProjectPanel();
  const { data: lifeAreas = [] } = useLifeAreas();
  const [searchParams, setSearchParams] = useSearchParams();

  // Track page view
  usePageTracking();

  // Handle ?new=true query parameter
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewProject();
      // Remove the query parameter
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, openNewProject]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [lifeAreaFilter, setLifeAreaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Build query params
  const queryParams = useMemo(() => {
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (lifeAreaFilter !== 'all') params.lifeAreaId = lifeAreaFilter;
    return params;
  }, [statusFilter, lifeAreaFilter]);

  const { data, isLoading, error, refetch } = useProjects(queryParams);

  // Filter and sort projects client-side for search and sorting
  const filteredProjects = useMemo(() => {
    let projects = data?.projects || [];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.outcome?.toLowerCase().includes(query) ||
        p.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    projects = [...projects].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        case 'updatedAt':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'createdAt':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        }
        default:
          return 0;
      }
    });

    // Pin pinned projects to top
    const pinned = projects.filter(p => p.pinned);
    const unpinned = projects.filter(p => !p.pinned);
    return [...pinned, ...unpinned];
  }, [data?.projects, searchQuery, sortBy]);

  // Count by status
  const statusCounts = useMemo(() => {
    const allProjects = data?.projects || [];
    return {
      all: allProjects.length,
      active: allProjects.filter(p => p.status === 'active').length,
      completed: allProjects.filter(p => p.status === 'completed').length,
      on_hold: allProjects.filter(p => p.status === 'on_hold').length,
      someday: allProjects.filter(p => p.status === 'someday').length,
    };
  }, [data?.projects]);

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader
        title="Projects"
        icon={FolderKanban}
        rightAction={
          <button
            onClick={openNewProject}
            className="p-2 text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        }
      />

      {/* Desktop Header */}
      <div className="hidden sm:block flex-shrink-0 p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Projects</h1>
            <p className="text-sm text-muted">
              Goal-driven efforts with a clear outcome and deadline
            </p>
          </div>
          <button
            onClick={openNewProject}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Status tabs */}
        <div className="mb-4">
          <TabNav
            tabs={STATUS_FILTERS.map(s => ({ ...s, count: statusCounts[s.id] || 0 }))}
            activeTab={statusFilter}
            onTabChange={setStatusFilter}
            variant="pill"
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Life area filter */}
          <select
            value={lifeAreaFilter}
            onChange={(e) => setLifeAreaFilter(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Categories</option>
            {lifeAreas.map((la) => (
              <option key={la._id} value={la._id}>{la.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted hover:text-text hover:bg-bg'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-muted hover:text-text hover:bg-bg'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="sm:hidden flex-shrink-0 px-4 py-3 border-b border-border space-y-3">
        {/* Status tabs */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <TabNav
            tabs={STATUS_FILTERS.map(s => ({ ...s, count: statusCounts[s.id] || 0 }))}
            activeTab={statusFilter}
            onTabChange={setStatusFilter}
            variant="pill"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <ProjectsListSkeleton viewMode={viewMode} />
        ) : error ? (
          <div className="text-center py-12 max-w-md mx-auto">
            <AlertTriangle className="w-16 h-16 mx-auto text-red-500/30 mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">Something went wrong</h3>
            <p className="text-muted mb-4">{error.message || 'Failed to load projects. Please try again.'}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 max-w-md mx-auto">
            <FolderKanban className="w-16 h-16 mx-auto text-muted/30 mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            {searchQuery ? (
              <p className="text-muted mb-4">Try adjusting your search or filters</p>
            ) : (
              <div className="text-sm text-muted mb-6 space-y-2">
                <p>
                  <strong className="text-text">Projects</strong> are goal-driven efforts with a defined outcome.
                  Unlike ongoing responsibilities, projects have a finish line.
                </p>
                <p className="text-xs">
                  Examples: "Launch new website", "Plan vacation", "Complete certification"
                </p>
              </div>
            )}
            {!searchQuery && (
              <button
                onClick={openNewProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            )}
          </div>
        ) : (() => {
          const favoritedProjects = filteredProjects.filter(p => p.favorited);
          const regularProjects = filteredProjects.filter(p => !p.favorited);
          const hasBoth = favoritedProjects.length > 0 && regularProjects.length > 0;

          return (
            <>
              {favoritedProjects.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <h2 className="text-sm font-medium text-text">Favorites</h2>
                  </div>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {favoritedProjects.map((project) => (
                        <ProjectCard key={project._id} project={project} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {favoritedProjects.map((project) => (
                        <ProjectCard key={project._id} project={project} compact />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasBoth && (
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-medium text-text">All Projects</h2>
                </div>
              )}

              {regularProjects.length > 0 && (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regularProjects.map((project) => (
                      <ProjectCard key={project._id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {regularProjects.map((project) => (
                      <ProjectCard key={project._id} project={project} compact />
                    ))}
                  </div>
                )
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

export default ProjectsList;
