import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, MessageCircle, UserMinus, Ban, Check, X } from 'lucide-react';
import UserAvatar from '../../../components/ui/UserAvatar';
import { cn, getDisplayName } from '../../../lib/utils';
import {
  useAcceptConnection,
  useDeclineConnection,
  useRemoveConnection,
  useBlockUser,
} from '../hooks/useConnections';

export default function ConnectionCard({
  connection,
  type = 'connection', // 'connection' | 'pending' | 'sent'
  onMessage,
  className,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const acceptMutation = useAcceptConnection();
  const declineMutation = useDeclineConnection();
  const removeMutation = useRemoveConnection();
  const blockMutation = useBlockUser();

  const user = connection?.user;
  const displayName = getDisplayName(user);

  const handleAccept = () => {
    acceptMutation.mutate(connection._id);
  };

  const handleDecline = () => {
    declineMutation.mutate(connection._id);
  };

  const handleRemove = () => {
    removeMutation.mutate(connection._id);
    setShowMenu(false);
  };

  const handleBlock = () => {
    blockMutation.mutate({ userId: user._id, reason: 'other' });
    setShowBlockConfirm(false);
    setShowMenu(false);
  };

  const isPending = acceptMutation.isPending || declineMutation.isPending || removeMutation.isPending;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-panel border border-border hover:bg-bg transition-all shadow-theme-card hover:shadow-theme-elevated',
        className
      )}
    >
      <Link to={`/app/social/profile/${user?._id}`}>
        <UserAvatar user={user} size="lg" showPresence />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/app/social/profile/${user?._id}`}
          className="font-medium text-text hover:text-primary transition-colors block truncate"
        >
          {displayName}
        </Link>
        {user?.profile?.bio && (
          <p className="text-sm text-muted truncate">{user.profile.bio}</p>
        )}
        {type === 'pending' && connection.message && (
          <p className="text-sm text-muted italic mt-1 truncate">
            "{connection.message}"
          </p>
        )}
        {type === 'connection' && connection.connectedAt && (
          <p className="text-xs text-muted mt-1">
            Connected {new Date(connection.connectedAt).toLocaleDateString()}
          </p>
        )}
        {type === 'sent' && (
          <p className="text-xs text-muted mt-1">
            Request sent {new Date(connection.sentAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {type === 'pending' && (
          <>
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Accept"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleDecline}
              disabled={isPending}
              className="p-2 rounded-lg bg-bg text-muted hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
              title="Decline"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        {type === 'sent' && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="px-3 py-1.5 text-sm rounded-lg bg-bg text-muted hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        {type === 'connection' && (
          <>
            {onMessage && (
              <button
                onClick={() => onMessage(user)}
                className="p-2 rounded-lg bg-bg hover:bg-panel2 text-muted transition-colors"
                title="Message"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-bg text-muted transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-panel glass border border-border rounded-xl shadow-lg z-20 py-1">
                    <button
                      onClick={handleRemove}
                      className="w-full px-3 py-2 text-sm text-left text-text hover:bg-bg flex items-center gap-2"
                    >
                      <UserMinus className="w-4 h-4" />
                      Remove connection
                    </button>
                    <button
                      onClick={() => {
                        setShowBlockConfirm(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-danger hover:bg-danger/10 flex items-center gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      Block user
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Block confirmation modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-panel border border-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-text mb-2">Block {displayName}?</h3>
            <p className="text-sm text-muted mb-4">
              They won't be able to see your profile, message you, or connect with you. This will also remove your connection.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 text-sm rounded-xl bg-bg text-text hover:bg-panel2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={blockMutation.isPending}
                className="px-4 py-2 text-sm rounded-xl bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
