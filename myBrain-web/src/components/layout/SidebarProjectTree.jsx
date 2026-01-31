import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, FolderKanban } from 'lucide-react';
import { useProjects } from '../../features/projects/hooks/useProjects';

export default function SidebarProjectTree({ collapsed }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useProjects({ status: 'active' });
  const projects = data?.projects || [];

  if (collapsed) return null;

  return (
    <div className="px-3 py-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted hover:text-text hover:bg-panel transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <FolderKanban className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Projects</span>
        <span className="text-xs text-muted">{projects.length}</span>
      </button>

      {isExpanded && projects.length > 0 && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {projects.slice(0, 10).map(project => {
            const isActive = location.pathname === `/app/projects/${project._id}`;
            return (
              <button
                key={project._id}
                onClick={() => navigate(`/app/projects/${project._id}`)}
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
                  <span className="text-[10px] text-muted">{project.progress.completed}/{project.progress.total}</span>
                )}
              </button>
            );
          })}
          {projects.length > 10 && (
            <button
              onClick={() => navigate('/app/projects')}
              className="w-full px-2 py-1 text-[10px] text-primary hover:underline text-left"
            >
              View all ({projects.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
