import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useUnfavoriteProject } from '../../features/projects/hooks/useProjects';

export default function SidebarFavorites({ collapsed }) {
  const navigate = useNavigate();
  const { data } = useProjects({ favorited: true });
  const unfavoriteMutation = useUnfavoriteProject();
  const favorites = (data?.projects || []).slice(0, 5);

  if (favorites.length === 0 || collapsed) return null;

  const handleUnfavorite = (e, projectId) => {
    e.stopPropagation();
    unfavoriteMutation.mutate(projectId);
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 px-2 mb-1">
        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Favorites</span>
      </div>
      <div className="space-y-0.5">
        {favorites.map(project => (
          <button
            key={project._id}
            onClick={() => navigate(`/app/projects/${project._id}`)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text hover:bg-panel transition-colors group"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#3b82f6' }}
            />
            <span className="truncate flex-1 text-left">{project.title}</span>
            <span
              onClick={(e) => handleUnfavorite(e, project._id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-bg"
              title="Remove from favorites"
            >
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            </span>
          </button>
        ))}
        {(data?.projects?.length || 0) > 5 && (
          <button
            onClick={() => navigate('/app/projects?favorited=true')}
            className="w-full px-2 py-1 text-xs text-primary hover:underline text-left"
          >
            View all favorites
          </button>
        )}
      </div>
    </div>
  );
}
