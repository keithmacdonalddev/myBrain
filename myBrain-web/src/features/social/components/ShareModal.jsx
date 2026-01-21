import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Share2,
  Users,
  Globe,
  Lock,
  Eye,
  MessageSquare,
  Edit3,
  Copy,
  Check,
  Trash2,
  Link2,
  Search,
  UserPlus
} from 'lucide-react';
import { itemSharesApi, connectionsApi } from '../../../lib/api';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useDebounce } from '../../../hooks/useDebounce';

const SHARE_TYPES = [
  { id: 'connection', label: 'Specific people', icon: Users, description: 'Share with your connections' },
  { id: 'public', label: 'Anyone with link', icon: Globe, description: 'Anyone can view with the link' },
  { id: 'password', label: 'Password protected', icon: Lock, description: 'Requires password to access' }
];

const PERMISSIONS = [
  { id: 'view', label: 'View', icon: Eye, description: 'Can view only' },
  { id: 'comment', label: 'Comment', icon: MessageSquare, description: 'Can view and comment' },
  { id: 'edit', label: 'Edit', icon: Edit3, description: 'Can view, comment, and edit' }
];

function ShareModal({ isOpen, onClose, itemId, itemType, itemTitle }) {
  const queryClient = useQueryClient();
  const [shareType, setShareType] = useState('connection');
  const [permission, setPermission] = useState('view');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Get existing share for this item
  const { data: existingShare, isLoading: loadingShare } = useQuery({
    queryKey: ['item-share', itemId, itemType],
    queryFn: () => itemSharesApi.getShareByItem(itemId, itemType),
    enabled: isOpen
  });

  // Get connections for user selection
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.getConnections(),
    enabled: isOpen && shareType === 'connection'
  });

  const connections = connectionsData?.connections || [];

  // Filter connections by search
  const filteredConnections = connections.filter(conn => {
    if (!debouncedSearch) return true;
    const name = conn.profile?.displayName || conn.email || '';
    return name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: (data) => itemSharesApi.shareItem(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['item-share', itemId, itemType] });
      queryClient.invalidateQueries({ queryKey: ['shares-by-me'] });
      // If it's a public share, show the link
      if (data.share.shareType !== 'connection') {
        setShareType(data.share.shareType);
      }
    }
  });

  // Update share mutation
  const updateMutation = useMutation({
    mutationFn: ({ shareId, updates }) => itemSharesApi.updateShare(shareId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-share', itemId, itemType] });
      queryClient.invalidateQueries({ queryKey: ['shares-by-me'] });
    }
  });

  // Revoke share mutation
  const revokeMutation = useMutation({
    mutationFn: (shareId) => itemSharesApi.revokeShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-share', itemId, itemType] });
      queryClient.invalidateQueries({ queryKey: ['shares-by-me'] });
      onClose();
    }
  });

  // Initialize from existing share
  useEffect(() => {
    if (existingShare?.share) {
      setShareType(existingShare.share.shareType || 'connection');
      setPermission(existingShare.share.permissions?.canEdit ? 'edit' :
        existingShare.share.permissions?.canComment ? 'comment' : 'view');
      setSelectedUsers(existingShare.share.sharedWithUsers?.map(u => u.userId) || []);
    }
  }, [existingShare]);

  const handleShare = () => {
    const permissionMap = {
      view: { canView: true, canComment: false, canEdit: false },
      comment: { canView: true, canComment: true, canEdit: false },
      edit: { canView: true, canComment: true, canEdit: true }
    };

    const shareData = {
      itemId,
      itemType,
      shareType,
      permissions: permissionMap[permission],
      sharedWithUserIds: shareType === 'connection' ? selectedUsers : []
    };

    if (shareType === 'password' && password) {
      shareData.password = password;
    }

    if (existingShare?.share?._id) {
      updateMutation.mutate({
        shareId: existingShare.share._id,
        updates: shareData
      });
    } else {
      shareMutation.mutate(shareData);
    }
  };

  const handleCopyLink = async () => {
    if (existingShare?.share?.shareToken) {
      const link = `${window.location.origin}/share/${existingShare.share.shareToken}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  const hasExistingShare = !!existingShare?.share;
  const shareLink = existingShare?.share?.shareToken
    ? `${window.location.origin}/share/${existingShare.share.shareToken}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-panel border border-border rounded-xl shadow-theme-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">
              Share {itemType}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Item info */}
          <div className="bg-bg rounded-lg p-3">
            <p className="text-sm text-muted">Sharing</p>
            <p className="font-medium text-text truncate">{itemTitle || 'Untitled'}</p>
          </div>

          {/* Share type selection */}
          <div>
            <label className="text-sm font-medium text-text mb-2 block">
              Who can access
            </label>
            <div className="space-y-2">
              {SHARE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setShareType(type.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    shareType === type.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <type.icon className={`w-5 h-5 ${
                    shareType === type.id ? 'text-primary' : 'text-muted'
                  }`} />
                  <div className="text-left">
                    <p className={`font-medium ${
                      shareType === type.id ? 'text-primary' : 'text-text'
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Permission level */}
          <div>
            <label className="text-sm font-medium text-text mb-2 block">
              Permission level
            </label>
            <div className="flex gap-2">
              {PERMISSIONS.map((perm) => (
                <button
                  key={perm.id}
                  onClick={() => setPermission(perm.id)}
                  className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    permission === perm.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <perm.icon className={`w-5 h-5 ${
                    permission === perm.id ? 'text-primary' : 'text-muted'
                  }`} />
                  <span className={`text-sm font-medium ${
                    permission === perm.id ? 'text-primary' : 'text-text'
                  }`}>
                    {perm.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* User selection for connection shares */}
          {shareType === 'connection' && (
            <div>
              <label className="text-sm font-medium text-text mb-2 block">
                Share with
              </label>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connections..."
                  className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUsers.map(userId => {
                    const user = connections.find(c => c._id === userId);
                    if (!user) return null;
                    return (
                      <span
                        key={userId}
                        className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        <UserAvatar user={user} size="xs" showPresence={false} />
                        {user.profile?.displayName || user.email}
                        <button
                          onClick={() => toggleUser(userId)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Connections list */}
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg">
                {filteredConnections.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">
                    {connections.length === 0
                      ? 'No connections yet'
                      : 'No connections found'
                    }
                  </p>
                ) : (
                  filteredConnections.map((conn) => (
                    <button
                      key={conn._id}
                      onClick={() => toggleUser(conn._id)}
                      className={`w-full flex items-center gap-3 p-2 hover:bg-bg transition-colors ${
                        selectedUsers.includes(conn._id) ? 'bg-primary/5' : ''
                      }`}
                    >
                      <UserAvatar user={conn} size="sm" showPresence={false} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-text">
                          {conn.profile?.displayName || conn.email}
                        </p>
                      </div>
                      {selectedUsers.includes(conn._id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Password for password-protected shares */}
          {shareType === 'password' && (
            <div>
              <label className="text-sm font-medium text-text mb-2 block">
                Password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password"
                className="w-full px-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Share link for public/password shares */}
          {hasExistingShare && shareLink && shareType !== 'connection' && (
            <div>
              <label className="text-sm font-medium text-text mb-2 block">
                Share link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-2 bg-bg border border-border rounded-lg text-sm text-muted"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-bg/50">
          {hasExistingShare ? (
            <button
              onClick={() => revokeMutation.mutate(existingShare.share._id)}
              disabled={revokeMutation.isPending}
              className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Stop sharing
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted hover:bg-bg rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={
                shareMutation.isPending ||
                updateMutation.isPending ||
                (shareType === 'connection' && selectedUsers.length === 0)
              }
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {hasExistingShare ? 'Update' : 'Share'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
