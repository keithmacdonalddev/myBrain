import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Pin,
  Calendar,
  Target,
  Folder,
  CheckCircle2,
  Clock,
  Pause,
  Archive,
  AlertCircle
} from 'lucide-react';
import { ProjectProgress } from './ProjectProgress';
import { LifeAreaBadge } from '../../lifeAreas/components/LifeAreaBadge';
import { useProjectPanel } from '../../../contexts/ProjectPanelContext';
import { useUpdateProjectStatus } from '../hooks/useProjects';

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    icon: Clock,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  on_hold: {
    label: 'On Hold',
    icon: Pause,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  someday: {
    label: 'Someday',
    icon: Archive,
    color: 'text-muted',
    bgColor: 'bg-muted/10',
  },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-danger', dot: 'bg-danger' },
  medium: { label: 'Medium', color: 'text-warning', dot: 'bg-warning' },
  low: { label: 'Low', color: 'text-muted', dot: 'bg-muted' },
};

export function ProjectCard({ project, compact = false }) {
  const navigate = useNavigate();
  const { openProject } = useProjectPanel();
  const updateStatus = useUpdateProjectStatus();
  const [showMenu, setShowMenu] = useState(false);

  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const priority = PRIORITY_CONFIG[project.priority];

  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  const formatDeadline = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff <= 7) return `Due in ${diff} days`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleClick = () => {
    navigate(`/app/projects/${project._id}`);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatus.mutateAsync({ id: project._id, status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
    setShowMenu(false);
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className="flex items-center gap-3 p-3 bg-bg hover:bg-panel2 rounded-xl cursor-pointer transition-colors group"
      >
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${status.bgColor.replace('/10', '')}`} />

        {/* Title */}
        <span className="flex-1 text-sm text-text truncate">{project.title}</span>

        {/* Progress */}
        {project.progress?.total > 0 && (
          <span className="text-xs text-muted">
            {project.progress.completed}/{project.progress.total}
          </span>
        )}

        {/* Deadline */}
        {project.deadline && (
          <span className={`text-xs ${isOverdue ? 'text-danger' : 'text-muted'}`}>
            {formatDeadline(project.deadline)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="card card-interactive cursor-pointer group hover:border-primary/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {project.pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
            <h3 className="text-base font-medium text-text truncate group-hover:text-primary transition-colors">
              {project.title}
            </h3>
          </div>

          {project.outcome && (
            <p className="text-sm text-muted line-clamp-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 flex-shrink-0" />
              {project.outcome}
            </p>
          )}
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-muted hover:text-text hover:bg-bg rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-panel glass border border-border rounded-xl shadow-theme-floating z-20">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(key); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg transition-colors ${
                        project.status === key ? config.color : 'text-text'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Status badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${status.bgColor} ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>

        {/* Priority */}
        {priority && (
          <span className={`inline-flex items-center gap-1 text-xs ${priority.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
        )}

        {/* Life area */}
        {project.lifeArea && (
          <LifeAreaBadge lifeArea={project.lifeArea} size="xs" />
        )}
      </div>

      {/* Progress */}
      {project.progress?.total > 0 && (
        <div className="mb-3">
          <ProjectProgress progress={project.progress} size="sm" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted">
        {/* Deadline */}
        {project.deadline ? (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger' : ''}`}>
            {isOverdue && <AlertCircle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {formatDeadline(project.deadline)}
          </span>
        ) : (
          <span />
        )}

        {/* Item counts */}
        <div className="flex items-center gap-3">
          {project.linkedNoteIds?.length > 0 && (
            <span>{project.linkedNoteIds.length} notes</span>
          )}
          {project.linkedTaskIds?.length > 0 && (
            <span>{project.linkedTaskIds.length} tasks</span>
          )}
          {project.linkedEventIds?.length > 0 && (
            <span>{project.linkedEventIds.length} events</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
