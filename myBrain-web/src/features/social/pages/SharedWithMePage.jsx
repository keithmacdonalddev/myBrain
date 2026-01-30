import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  FolderKanban,
  CheckSquare,
  StickyNote,
  FolderOpen,
  File,
  Eye,
  MessageSquare,
  Edit3,
  Clock,
  User,
  Filter,
  X,
  AlertTriangle
} from 'lucide-react';
import { itemSharesApi } from '../../../lib/api';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

const ITEM_TYPE_CONFIG = {
  project: { icon: FolderKanban, label: 'Project', color: 'text-purple-500', path: '/app/projects' },
  task: { icon: CheckSquare, label: 'Task', color: 'text-blue-500', path: '/app/tasks' },
  note: { icon: StickyNote, label: 'Note', color: 'text-yellow-500', path: '/app/notes' },
  folder: { icon: FolderOpen, label: 'Folder', color: 'text-orange-500', path: '/app/files' },
  file: { icon: File, label: 'File', color: 'text-green-500', path: '/app/files' }
};

const PERMISSION_CONFIG = {
  view: { icon: Eye, label: 'View only', color: 'text-muted' },
  comment: { icon: MessageSquare, label: 'Can comment', color: 'text-blue-500' },
  edit: { icon: Edit3, label: 'Can edit', color: 'text-green-500' }
};

function SharedItemCard({ share, onAccept }) {
  const navigate = useNavigate();
  const typeConfig = ITEM_TYPE_CONFIG[share.itemType] || ITEM_TYPE_CONFIG.file;
  const TypeIcon = typeConfig.icon;

  // Get permission from share data
  const permission = share.permission || 'view';
  const permConfig = PERMISSION_CONFIG[permission];
  const PermIcon = permConfig?.icon || Eye;

  // Check if this is a pending share
  const isPending = share.status === 'pending';
  const sharedAt = share.sharedAt ? new Date(share.sharedAt) : new Date(share.createdAt);
  const itemId = share.item?._id;
  const itemTitle = share.item?.title || share.title || 'Untitled';

  const handleClick = () => {
    if (isPending || !itemId) return;
    // Navigate to the item
    if (share.itemType === 'project') {
      navigate(`/app/projects/${itemId}`);
    } else if (share.itemType === 'task') {
      navigate(`/app/tasks/${itemId}`);
    } else if (share.itemType === 'note') {
      navigate(`/app/notes/${itemId}`);
    } else if (share.itemType === 'folder') {
      navigate(`/app/files?folder=${itemId}`);
    } else if (share.itemType === 'file') {
      navigate(`/app/files?file=${itemId}`);
    }
  };

  return (
    <div
      className={`bg-panel border border-border rounded-lg p-4 ${
        isPending ? 'opacity-75' : 'hover:border-primary/50 cursor-pointer'
      } transition-colors`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Item type icon */}
        <div className={`p-2 rounded-lg bg-bg ${typeConfig.color}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text truncate">
              {itemTitle}
            </h3>
            {isPending && (
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 text-xs rounded-full">
                Pending
              </span>
            )}
          </div>

          {share.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">
              {share.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            {/* Owner */}
            <div className="flex items-center gap-1.5">
              <UserAvatar
                user={share.owner}
                size="xs"
                showPresence={false}
              />
              <span>{share.owner?.profile?.displayName || share.owner?.email}</span>
            </div>

            {/* Permission */}
            <div className="flex items-center gap-1">
              <PermIcon className="w-3.5 h-3.5" />
              <span>{permConfig?.label}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{sharedAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accept button for pending shares */}
      {isPending && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept(share._id);
            }}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}

function SharedWithMePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, pending, project, task, note, file, folder

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shared-with-me', filter],
    queryFn: () => itemSharesApi.getSharedWithMe({
      itemType: filter !== 'all' && filter !== 'pending' ? filter : undefined
    })
  });

  const acceptMutation = useMutation({
    mutationFn: (shareId) => itemSharesApi.acceptShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-with-me'] });
    }
  });

  const shares = data?.shares || [];

  // Filter shares
  const filteredShares = shares.filter(share => {
    if (filter === 'pending') {
      return share.status === 'pending';
    }
    return true;
  });

  // Count pending
  const pendingCount = shares.filter(share => share.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-bg">
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="mb-4">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-bg">
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon={AlertTriangle}
            title="Something went wrong"
            description={error.message || "Failed to load shared items. Please try again."}
            action={{ label: "Try Again", onClick: () => refetch() }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Shared with Me</h1>
            <p className="text-sm text-muted">
              Items that others have shared with you
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-panel border border-border text-muted hover:text-text'
            }`}
          >
            All
          </button>

          {pendingCount > 0 && (
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-panel border border-border text-muted hover:text-text'
              }`}
            >
              Pending
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {pendingCount}
              </span>
            </button>
          )}

          {Object.entries(ITEM_TYPE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-panel border border-border text-muted hover:text-text'
              }`}
            >
              <config.icon className="w-4 h-4" />
              {config.label}s
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        {filteredShares.length === 0 ? (
          <EmptyState
            icon={Share2}
            title={filter === 'pending' ? 'No pending shares' : 'No shared items'}
            description={
              filter === 'pending'
                ? "You don't have any pending share invitations."
                : "When someone shares projects, tasks, notes, or files with you, they'll appear here."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredShares.map((share) => (
              <SharedItemCard
                key={share._id}
                share={share}
                onAccept={(id) => acceptMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SharedWithMePage;
