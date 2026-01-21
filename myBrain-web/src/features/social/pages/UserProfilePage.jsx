import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Link as LinkIcon,
  Calendar,
  Users,
  MessageCircle,
  UserPlus,
  Clock,
  Check,
  Ban,
  MoreHorizontal,
  Loader2,
  Flag,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import UserAvatar from '../../../components/ui/UserAvatar';
import {
  useUserProfile,
  useSendConnectionRequest,
  useRemoveConnection,
  useBlockUser,
} from '../hooks/useConnections';
import { cn } from '../../../lib/utils';
import ReportModal from '../components/ReportModal';

function getDisplayName(profile) {
  if (!profile) return 'Unknown User';
  const { displayName, firstName, lastName } = profile;
  if (displayName) return displayName;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return 'Unknown User';
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const currentUser = useSelector((state) => state.auth.user);
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { data, isLoading, error } = useUserProfile(userId);
  const sendRequest = useSendConnectionRequest();
  const removeMutation = useRemoveConnection();
  const blockMutation = useBlockUser();

  const isOwnProfile = currentUser?._id === userId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <p className="text-muted mb-4">
          This user may not exist or you may not have permission to view their profile.
        </p>
        <Link
          to="/app/social/connections"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to connections
        </Link>
      </div>
    );
  }

  const profile = data?.profile;
  const connection = data?.connection;
  const canMessage = data?.canMessage;
  const canConnect = data?.canConnect;

  if (profile?.isPrivate) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          to="/app/social/connections"
          className="inline-flex items-center gap-2 text-muted hover:text-text mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to connections
        </Link>

        <div className="bg-panel rounded-lg border border-border p-8 text-center">
          <UserAvatar user={profile} size="2xl" className="mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">
            {profile?.profile?.displayName || 'Private Profile'}
          </h1>
          <p className="text-muted mb-6">
            This user has a private profile.
          </p>
          {canConnect && (
            <button
              onClick={() => sendRequest.mutate({ userId, source: 'profile' })}
              disabled={sendRequest.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Send Connection Request
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleConnect = () => {
    sendRequest.mutate({ userId, source: 'profile' });
  };

  const handleRemoveConnection = () => {
    if (connection?.connectionId) {
      removeMutation.mutate(connection.connectionId);
    }
    setShowMenu(false);
  };

  const handleBlock = () => {
    blockMutation.mutate({ userId, reason: 'other' });
    setShowBlockConfirm(false);
    setShowMenu(false);
  };

  const displayName = getDisplayName(profile?.profile);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        to="/app/social/connections"
        className="inline-flex items-center gap-2 text-muted hover:text-text mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to connections
      </Link>

      {/* Profile Header */}
      <div className="bg-panel rounded-lg border border-border overflow-hidden">
        {/* Cover area */}
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/10" />

        {/* Profile info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <UserAvatar
              user={profile}
              size="2xl"
              showPresence
              className="ring-4 ring-background"
            />

            <div className="flex-1 sm:pb-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {profile?.presence?.statusMessage && (
                <p className="text-sm text-muted">
                  {profile.presence.statusMessage}
                </p>
              )}
            </div>

            {/* Actions */}
            {!isOwnProfile && (
              <div className="flex items-center gap-2 sm:pb-2">
                {connection?.status === 'accepted' ? (
                  <>
                    {canMessage && (
                      <Link
                        to={`/app/messages?user=${userId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </Link>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-lg bg-bg hover:bg-bg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {showMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-panel border border-border rounded-lg shadow-theme-floating z-20 py-1">
                            <button
                              onClick={handleRemoveConnection}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-bg flex items-center gap-2"
                            >
                              Remove connection
                            </button>
                            <button
                              onClick={() => {
                                setShowReportModal(true);
                                setShowMenu(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-bg flex items-center gap-2 text-muted"
                            >
                              <Flag className="w-4 h-4" />
                              Report user
                            </button>
                            <button
                              onClick={() => {
                                setShowBlockConfirm(true);
                                setShowMenu(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-danger/90 hover:text-white flex items-center gap-2"
                            >
                              <Ban className="w-4 h-4" />
                              Block user
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : connection?.status === 'pending' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-bg rounded-lg text-muted">
                    <Clock className="w-4 h-4" />
                    {connection.isRequester ? 'Request Pending' : 'Wants to Connect'}
                  </div>
                ) : canConnect ? (
                  <button
                    onClick={handleConnect}
                    disabled={sendRequest.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    Connect
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="mt-6 grid gap-6">
        {/* Bio */}
        {profile?.profile?.bio && (
          <div className="bg-panel rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-2">About</h2>
            <p className="text-muted">{profile.profile.bio}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-panel rounded-lg border border-border p-4">
          <h2 className="font-semibold mb-3">Info</h2>
          <div className="space-y-2">
            {profile?.profile?.location && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <MapPin className="w-4 h-4" />
                {profile.profile.location}
              </div>
            )}
            {profile?.profile?.website && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="w-4 h-4 text-muted" />
                <a
                  href={profile.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profile.profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {profile?.joinedAt && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {profile?.stats && (
          <div className="bg-panel rounded-lg border border-border p-4">
            <h2 className="font-semibold mb-3">Stats</h2>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {profile.stats.connectionCount || 0}
                </div>
                <div className="text-sm text-muted">Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {profile.stats.projectCount || 0}
                </div>
                <div className="text-sm text-muted">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {profile.stats.sharedItemCount || 0}
                </div>
                <div className="text-sm text-muted">Shared</div>
              </div>
            </div>
          </div>
        )}

        {/* Connection badge */}
        {profile?.isConnected && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
            <Check className="w-4 h-4" />
            You are connected with {displayName}
          </div>
        )}
      </div>

      {/* Block confirmation modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-panel border border-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Block {displayName}?</h3>
            <p className="text-sm text-muted mb-4">
              They won't be able to see your profile, message you, or connect with you.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg bg-bg hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={blockMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="user"
        targetId={userId}
        targetName={displayName}
      />
    </div>
  );
}
