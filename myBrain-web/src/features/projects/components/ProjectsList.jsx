import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  FolderKanban,
  Clock,
  CheckCircle2,
  Pause,
  Archive,
  SortAsc,
  LayoutGrid,
  List
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useLifeAreas } from '../../lifeAreas/hooks/useLifeAreas';
import { ProjectCard } from './ProjectCard';
import { useProjectPanel } from '../../../contexts/ProjectPanelContext';
import { usePageTracking } from '../../../hooks/useAnalytics';

const STATUS_FILTERS = [
  { value: 'all', label: 'All', icon: FolderKanban },
  { value: 'active', label: 'Active', icon: Clock },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'on_hold', label: 'On Hold', icon: Pause },
  { value: 'someday', label: 'Someday', icon: Archive },
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

  // Track page view
  usePageTracking();

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

  const { data, isLoading, error } = useProjects(queryParams);

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-border">
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
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {STATUS_FILTERS.map((status) => {
            const Icon = status.icon;
            const count = statusCounts[status.value] || 0;
            return (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  statusFilter === status.value
                    ? 'bg-primary text-white'
                    : 'text-muted hover:text-text hover:bg-bg'
                }`}
              >
                <Icon className="w-4 h-4" />
                {status.label}
                <span className={`text-xs ${statusFilter === status.value ? 'text-white/70' : 'text-muted'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
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
            <option value="all">All Life Areas</option>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-danger">{error.message || 'Failed to load projects'}</p>
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <ProjectCard key={project._id} project={project} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsList;
