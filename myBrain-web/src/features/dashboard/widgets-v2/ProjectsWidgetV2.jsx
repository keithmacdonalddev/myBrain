/**
 * ProjectsWidgetV2 - Projects widget with progress bars and hover actions
 *
 * Features:
 * - Header with title (folder emoji) and filter dropdown
 * - Filter dropdown: Active / All / Archived
 * - Project cards with:
 *   - Color indicator bar (purple, blue, green, orange)
 *   - Project name
 *   - Progress bar showing completion percentage
 *   - Percentage text
 *   - Hover actions: Open and + Task buttons
 * - "New Project" button at bottom
 * - Loading skeleton state
 * - Empty state
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useProjectPanel } from '../../../contexts/ProjectPanelContext';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';

/**
 * Color rotation for project cards
 * Assigns colors based on project index or uses project.color if available
 */
const COLORS = ['purple', 'blue', 'green', 'orange'];

/**
 * Get color class for a project
 * Uses project.color if available, otherwise rotates through COLORS array
 *
 * @param {Object} project - Project object
 * @param {number} index - Index in the projects array
 * @returns {string} Color class name
 */
const getProjectColor = (project, index) => {
  if (project.color && COLORS.includes(project.color)) {
    return project.color;
  }
  return COLORS[index % COLORS.length];
};

/**
 * ProjectsWidgetV2 Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.projects - Array of project objects from dashboard API
 * @param {boolean} props.loading - Loading state for skeleton display
 */
function ProjectsWidgetV2({ projects = [], loading = false }) {
  // Panel contexts for opening project/task panels
  const { openProject, openNewProject } = useProjectPanel();
  const { openNewTask } = useTaskPanel();

  // Filter state: 'active' | 'all' | 'archived'
  const [filter, setFilter] = useState('active');

  /**
   * Filter projects based on selected filter
   */
  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return [];

    switch (filter) {
      case 'active':
        return projects.filter((p) => p.status === 'active' || !p.status);
      case 'archived':
        return projects.filter((p) => p.status === 'archived');
      case 'all':
      default:
        return projects;
    }
  }, [projects, filter]);

  /**
   * Handle filter dropdown change
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Handle project card click - opens project panel
   */
  const handleProjectClick = (projectId) => {
    openProject(projectId);
  };

  /**
   * Handle "Open" button click
   */
  const handleOpenClick = (e, projectId) => {
    e.stopPropagation();
    openProject(projectId);
  };

  /**
   * Handle "+ Task" button click - opens task creation with project context
   */
  const handleAddTaskClick = (e, project) => {
    e.stopPropagation();
    // Open new task panel with project pre-selected
    openNewTask({ projectId: project._id });
  };

  /**
   * Handle "New Project" button click
   */
  const handleNewProjectClick = () => {
    openNewProject();
  };

  /**
   * Render loading skeleton
   */
  const renderSkeleton = () => (
    <div className="project-list">
      {[1, 2, 3].map((i) => (
        <div key={i} className="project-card">
          <div className="project-color skeleton-v2" style={{ width: 4, height: 40 }}></div>
          <div className="project-info">
            <div className="skeleton-v2" style={{ width: '60%', height: 14, marginBottom: 8 }}></div>
            <div className="project-bar">
              <div className="skeleton-v2" style={{ width: '50%', height: '100%' }}></div>
            </div>
          </div>
          <span className="project-percent" style={{ opacity: 0.3 }}>--%</span>
        </div>
      ))}
    </div>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <div className="v2-empty-state">
      <p>No projects to show</p>
      <button className="v2-btn v2-btn--secondary" onClick={handleNewProjectClick}>
        Create a project
      </button>
    </div>
  );

  /**
   * Render a single project card
   */
  const renderProjectCard = (project, index) => {
    const color = getProjectColor(project, index);
    const progress = project.progress ?? 0;
    const projectName = project.name || project.title || 'Untitled Project';

    return (
      <div
        key={project._id}
        className="project-card"
        onClick={() => handleProjectClick(project._id)}
      >
        {/* Color indicator bar */}
        <div className={`project-color ${color}`}></div>

        {/* Project info: name and progress bar */}
        <div className="project-info">
          <p className="project-name">{projectName}</p>
          <div className="project-bar">
            <div
              className={`project-bar-fill ${color}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Progress percentage */}
        <span className="project-percent">{progress}%</span>

        {/* Hover actions */}
        <div className="project-actions">
          <button
            className="mini-btn primary"
            onClick={(e) => handleOpenClick(e, project._id)}
          >
            Open
          </button>
          <button
            className="mini-btn secondary"
            onClick={(e) => handleAddTaskClick(e, project)}
          >
            + Task
          </button>
        </div>
      </div>
    );
  };

  const isEmpty = filteredProjects.length === 0;

  return (
    <div className="widget project-widget">
      {/* Widget header with title and filter dropdown */}
      <div className="widget-header">
        <span className="widget-title">&#128193; Projects</span>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Project list */}
      {loading ? (
        renderSkeleton()
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <div className="project-list">
          {filteredProjects.map((project, index) => renderProjectCard(project, index))}
        </div>
      )}

      {/* Add project button - only show when not empty */}
      {!loading && !isEmpty && (
        <button className="add-task-btn" onClick={handleNewProjectClick}>
          + New Project
        </button>
      )}
    </div>
  );
}

ProjectsWidgetV2.propTypes = {
  /** Array of project objects from dashboard API */
  projects: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string,
      title: PropTypes.string,
      status: PropTypes.oneOf(['active', 'completed', 'archived']),
      progress: PropTypes.number,
      taskCount: PropTypes.number,
      color: PropTypes.oneOf(['purple', 'blue', 'green', 'orange']),
    })
  ),
  /** Loading state for skeleton display */
  loading: PropTypes.bool,
};

export default ProjectsWidgetV2;
