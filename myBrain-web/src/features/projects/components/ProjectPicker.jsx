import { useState, useRef, useEffect } from 'react';
import { ChevronDown, FolderKanban, X } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';

export function ProjectPicker({ value, onChange, placeholder = 'Select project', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { data, isLoading } = useProjects({ status: 'active' });
  const projects = data?.projects || [];

  const selectedProject = projects.find((p) => p._id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (project) => {
    onChange(project._id);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-sm hover:border-muted transition-colors"
      >
        {selectedProject ? (
          <div className="flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5 text-primary" />
            <span className="text-text truncate">{selectedProject.title}</span>
          </div>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <div className="flex items-center gap-1">
          {selectedProject && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-border rounded"
              aria-label="Clear project selection"
            >
              <X className="w-3 h-3 text-muted" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-50 max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">No active projects</div>
          ) : (
            projects.map((project) => (
              <button
                key={project._id}
                type="button"
                onClick={() => handleSelect(project)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg transition-colors ${
                  value === project._id ? 'bg-primary/10' : ''
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <span className="text-text truncate">{project.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectPicker;
