import { useState } from 'react';
import {
  FileText,
  CheckSquare,
  FolderOpen,
  Image,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useUserContent } from '../hooks/useAdminUsers';

const contentTypes = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'images', label: 'Images', icon: Image },
];

function ContentCountCard({ icon: Icon, label, count, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isActive
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 bg-bg'
      }`}
    >
      <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-bg'}`}>
        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted'}`} />
      </div>
      <div className="text-left">
        <p className="text-lg font-semibold text-text">{count}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </button>
  );
}

function ContentList({ type, items, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center p-8 text-muted">
        No {type} found
      </div>
    );
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (type === 'images') {
    return (
      <div className="grid grid-cols-3 gap-2 p-4">
        {items.map((image) => (
          <div
            key={image._id}
            className="aspect-square bg-bg rounded-lg overflow-hidden relative group"
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.alt || image.originalName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white rounded-full"
              >
                <ExternalLink className="w-4 h-4 text-black" />
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item._id} className="p-3 hover:bg-bg/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-text truncate">
                {item.title || item.name}
              </p>
              {(item.contentPreview || item.descriptionPreview) && (
                <p className="text-xs text-muted mt-1 line-clamp-2">
                  {item.contentPreview || item.descriptionPreview}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                {item.status && (
                  <span className={`px-1.5 py-0.5 rounded ${
                    item.status === 'active' || item.status === 'completed'
                      ? 'bg-green-500/10 text-green-500'
                      : item.status === 'archived' || item.status === 'cancelled'
                      ? 'bg-gray-500/10 text-gray-500'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {item.status}
                  </span>
                )}
                {item.priority && (
                  <span className={`px-1.5 py-0.5 rounded ${
                    item.priority === 'high' || item.priority === 'urgent'
                      ? 'bg-red-500/10 text-red-500'
                      : item.priority === 'medium'
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {item.priority}
                  </span>
                )}
                <span>{formatDate(item.updatedAt || item.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserContentTab({ user }) {
  const [activeType, setActiveType] = useState('notes');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: contentData, isLoading, error } = useUserContent(
    user._id,
    activeType,
    { limit, skip: page * limit }
  );

  const counts = contentData?.counts || {
    notes: 0,
    tasks: 0,
    projects: 0,
    images: 0,
    total: 0,
  };

  const items = contentData?.[activeType] || contentData?.notes || contentData?.tasks || contentData?.projects || contentData?.images || [];
  const total = contentData?.total || 0;

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Failed to load user content
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Content count cards */}
      <div className="grid grid-cols-2 gap-2">
        {contentTypes.map(({ id, label, icon }) => (
          <ContentCountCard
            key={id}
            icon={icon}
            label={label}
            count={counts[id] || 0}
            isActive={activeType === id}
            onClick={() => {
              setActiveType(id);
              setPage(0);
            }}
          />
        ))}
      </div>

      {/* Total count */}
      <div className="text-center text-sm text-muted">
        Total content: {counts.total} items
      </div>

      {/* Content list */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-bg px-3 py-2 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-medium text-text capitalize">{activeType}</h4>
          <span className="text-xs text-muted">
            {total} total
          </span>
        </div>
        <ContentList
          type={activeType}
          items={items}
          isLoading={isLoading}
        />

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs bg-panel border border-border rounded hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-muted">
              Page {page + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 text-xs bg-panel border border-border rounded hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
