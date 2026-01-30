/**
 * SessionsList Component
 *
 * Displays all active sessions with revoke functionality.
 * Includes confirmation dialogs for session revocation and bulk logout.
 */
import { useState } from 'react';
import { Monitor } from 'lucide-react';
import { useSessions, useRevokeSession, useLogoutAll } from '../hooks/useSessions';
import SessionCard from './SessionCard';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

/**
 * Sessions list with revoke and logout-all functionality
 */
export default function SessionsList() {
  const { data, isLoading } = useSessions();
  const revokeMutation = useRevokeSession();
  const logoutAllMutation = useLogoutAll();

  // State for confirmation dialogs
  const [confirmRevoke, setConfirmRevoke] = useState(null); // Session to revoke
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

  // Loading state
  if (isLoading) {
    return <Skeleton.List count={3} />;
  }

  // Extract sessions from response
  const sessions = data?.sessions || [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  // Handle revoke confirmation
  const handleRevokeConfirm = () => {
    if (confirmRevoke) {
      revokeMutation.mutate(confirmRevoke);
      setConfirmRevoke(null);
    }
  };

  // Handle logout-all confirmation
  const handleLogoutAllConfirm = () => {
    logoutAllMutation.mutate();
    setShowLogoutAllConfirm(false);
  };

  // Find session being revoked for display in dialog
  const sessionToRevoke = confirmRevoke
    ? sessions.find((s) => s.id === confirmRevoke)
    : null;

  return (
    <div className="space-y-6">
      {/* Header with session count and bulk action */}
      <div className="flex items-center justify-between">
        <p className="text-muted">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
        </p>
        {otherSessions.length > 0 && (
          <button
            onClick={() => setShowLogoutAllConfirm(true)}
            disabled={logoutAllMutation.isPending}
            className="text-sm text-[var(--danger)] hover:underline disabled:opacity-50"
          >
            Sign out all other sessions
          </button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onRevoke={() => setConfirmRevoke(session.id)}
            isRevoking={
              revokeMutation.isPending && revokeMutation.variables === session.id
            }
          />
        ))}
      </div>

      {/* Empty state when only current session exists */}
      {sessions.length === 1 && (
        <EmptyState
          icon={Monitor}
          title="Only one active session"
          description="This is your current session. Other sessions will appear here when you sign in from other devices."
        />
      )}

      {/* Revoke Single Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={handleRevokeConfirm}
        title="Revoke this session?"
        message={
          sessionToRevoke
            ? `This will sign out the device "${
                sessionToRevoke.device?.display ||
                sessionToRevoke.device?.browser ||
                'Unknown'
              }" immediately. They will need to sign in again.`
            : 'This will sign out the device immediately.'
        }
        confirmText="Revoke Session"
        variant="danger"
      />

      {/* Logout All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutAllConfirm}
        onClose={() => setShowLogoutAllConfirm(false)}
        onConfirm={handleLogoutAllConfirm}
        title="Sign out everywhere?"
        message={`This will sign you out of all ${otherSessions.length} other session${
          otherSessions.length !== 1 ? 's' : ''
        }. You will remain signed in on this device.`}
        confirmText="Sign Out All"
        variant="danger"
      />
    </div>
  );
}
