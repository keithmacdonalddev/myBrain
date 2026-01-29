/**
 * =============================================================================
 * MYSHARESPAGE.JSX - Items I've Shared
 * =============================================================================
 *
 * Shows all items the user has shared with others.
 * Includes copy link functionality for public/password shares.
 *
 * =============================================================================
 */

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
  Users,
  Globe,
  Lock,
  Copy,
  Check,
  Trash2,
  Link2,
  BarChart2,
  Loader2
} from 'lucide-react';
import { itemSharesApi } from '../../../lib/api';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import useToast from '../../../hooks/useToast';

const ITEM_TYPE_CONFIG = {
  project: { icon: FolderKanban, label: 'Project', color: 'text-purple-500', path: '/app/projects' },
  task: { icon: CheckSquare, label: 'Task', color: 'text-blue-500', path: '/app/tasks' },
  note: { icon: StickyNote, label: 'Note', color: 'text-yellow-500', path: '/app/notes' },
  folder: { icon: FolderOpen, label: 'Folder', color: 'text-orange-500', path: '/app/files' },
  file: { icon: File, label: 'File', color: 'text-green-500', path: '/app/files' }
};

const SHARE_TYPE_CONFIG = {
  connection: { icon: Users, label: 'Connections', color: 'text-blue-500' },
  public: { icon: Globe, label: 'Public link', color: 'text-green-500' },
  password: { icon: Lock, label: 'Password protected', color: 'text-amber-500' }
};

function SharedItemCard({ share, onRevoke, onCopyLink }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeConfig = ITEM_TYPE_CONFIG[share.itemType] || ITEM_TYPE_CONFIG.file;
  const TypeIcon = typeConfig.icon;
  const shareTypeConfig = SHARE_TYPE_CONFIG[share.shareType] || SHARE_TYPE_CONFIG.connection;
  const ShareTypeIcon = shareTypeConfig.icon;

  // Get permission level
  const permission = share.permissions?.canEdit ? 'Edit' :
    share.permissions?.canComment ? 'Comment' : 'View';

  const itemTitle = share.item?.title || 'Untitled';
  const hasShareLink = share.shareToken && share.shareType !== 'connection';
  const shareLink = hasShareLink ? `${window.location.origin}/share/${share.shareToken}` : null;

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    if (shareLink) {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewItem = () => {
    if (!share.item?._id) return;
    if (share.itemType === 'project') {
      navigate(`/app/projects/${share.item._id}`);
    } else if (share.itemType === 'task') {
      navigate(`/app/tasks/${share.item._id}`);
    } else if (share.itemType === 'note') {
      navigate(`/app/notes/${share.item._id}`);
    }
  };

  return (
    <div className="bg-panel border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Item type icon */}
        <div className={`p-2 rounded-lg bg-bg ${typeConfig.color}`}>
          <TypeIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewItem}
              className="font-medium text-text truncate hover:text-primary transition-colors"
            >
              {itemTitle}
            </button>
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${shareTypeConfig.color} bg-current/10`}>
              <ShareTypeIcon className="w-3 h-3" />
              {shareTypeConfig.label}
            </span>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {permission}
            </span>

            {share.accessCount !== undefined && (
              <span className="flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                {share.accessCount} views
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(share.createdAt).toLocaleDateString()}
            </span>

            {share.expiresAt && (
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="w-3.5 h-3.5" />
                Expires {new Date(share.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Shared with users (for connection shares) */}
          {share.shareType === 'connection' && share.sharedWithUsers?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted">Shared with:</span>
              <div className="flex -space-x-2">
                {share.sharedWithUsers.slice(0, 3).map((user, idx) => (
                  <UserAvatar
                    key={user.userId || idx}
                    user={user}
                    size="xs"
                    className="ring-2 ring-panel"
                  />
                ))}
                {share.sharedWithUsers.length > 3 && (
                  <span className="text-xs text-muted ml-2">
                    +{share.sharedWithUsers.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasShareLink && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRevoke(share._id);
            }}
            className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Stop sharing"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share link display for public/password shares */}
      {hasShareLink && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted flex-shrink-0" />
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-muted"
              onClick={(e) => e.target.select()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MySharesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['shares-by-me', filter],
    queryFn: () => itemSharesApi.getSharedByMe({
      itemType: filter !== 'all' ? filter : undefined
    })
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId) => itemSharesApi.revokeShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares-by-me'] });
      toast.success('Share revoked');
    },
    onError: () => {
      toast.error('Failed to revoke share');
    }
  });

  const shares = data?.shares || [];

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
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
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
            <h1 className="text-xl font-semibold text-text">My Shares</h1>
            <p className="text-sm text-muted">
              Items you've shared with others
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
            All ({shares.length})
          </button>

          {Object.entries(ITEM_TYPE_CONFIG).map(([type, config]) => {
            const count = shares.filter(s => s.itemType === type).length;
            if (count === 0) return null;
            return (
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
                {config.label}s ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        {shares.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="No shared items"
            description="When you share projects, tasks, notes, or files, they'll appear here."
          />
        ) : (
          <div className="space-y-4">
            {shares
              .filter(s => filter === 'all' || s.itemType === filter)
              .map((share) => (
                <SharedItemCard
                  key={share._id}
                  share={share}
                  onRevoke={(id) => revokeMutation.mutate(id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
