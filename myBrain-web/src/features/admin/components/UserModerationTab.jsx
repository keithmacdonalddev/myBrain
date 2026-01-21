import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Clock,
  MessageSquare,
  Shield,
  ShieldX,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Mail
} from 'lucide-react';
import {
  useUserModerationHistory,
  useWarnUser,
  useSuspendUser,
  useUnsuspendUser,
  useBanUser,
  useUnbanUser,
  useAddAdminNote,
  useSendAdminMessage
} from '../hooks/useAdminUsers';
import WarnUserModal from './WarnUserModal';
import SuspendUserModal from './SuspendUserModal';
import BanUserModal from './BanUserModal';
import AddAdminNoteModal from './AddAdminNoteModal';
import SendAdminMessageModal from './SendAdminMessageModal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

function StatusCard({ icon: Icon, label, value, variant = 'default' }) {
  const colorClasses = {
    default: 'bg-bg border-border',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
    success: 'bg-green-500/10 border-green-500/30',
  };

  const iconClasses = {
    default: 'text-muted',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    success: 'text-green-500',
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconClasses[variant]}`} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default', disabled }) {
  const colorClasses = {
    default: 'border-border hover:border-primary/50 text-muted hover:text-text',
    warning: 'border-yellow-500/30 hover:border-yellow-500 text-yellow-500 hover:bg-yellow-500/10',
    danger: 'border-red-500/30 hover:border-red-500 text-red-500 hover:bg-red-500/10',
    success: 'border-green-500/30 hover:border-green-500 text-green-500 hover:bg-green-500/10',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[variant]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function HistoryItem({ action }) {
  const getIcon = () => {
    switch (action.actionType) {
      case 'warning': return AlertTriangle;
      case 'suspension': return Ban;
      case 'unsuspend': return CheckCircle;
      case 'ban': return ShieldX;
      case 'unban': return ShieldCheck;
      case 'note': return MessageSquare;
      case 'status_change': return Shield;
      default: return User;
    }
  };

  const getColor = () => {
    switch (action.actionType) {
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'suspension': return 'text-red-500 bg-red-500/10';
      case 'unsuspend': return 'text-green-500 bg-green-500/10';
      case 'ban': return 'text-red-600 bg-red-600/10';
      case 'unban': return 'text-green-500 bg-green-500/10';
      case 'note': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-muted bg-bg';
    }
  };

  const Icon = getIcon();

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={`p-2 rounded-lg ${getColor()}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text capitalize">
            {action.actionType.replace('_', ' ')}
          </span>
          {action.details?.warningLevel && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/10 text-yellow-500">
              Level {action.details.warningLevel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-1">{action.reason}</p>
        {action.details?.noteContent && (
          <p className="text-xs text-text mt-2 p-2 bg-bg rounded border border-border">
            {action.details.noteContent}
          </p>
        )}
        {action.details?.suspendedUntil && (
          <p className="text-xs text-red-500 mt-1">
            Until: {formatDate(action.details.suspendedUntil)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
          <span>by {action.performedBy?.name || action.performedBy?.email || 'Unknown'}</span>
          <span>{formatDate(action.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function UserModerationTab({ user }) {
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { data, isLoading, error } = useUserModerationHistory(user._id);
  const warnUser = useWarnUser();
  const suspendUser = useSuspendUser();
  const unsuspendUser = useUnsuspendUser();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const addAdminNote = useAddAdminNote();
  const sendAdminMessage = useSendAdminMessage();

  const moderationStatus = user.moderationStatus || {};
  const isSuspended = moderationStatus.isSuspended;
  const isBanned = moderationStatus.isBanned;
  const actions = data?.actions || [];

  const handleWarn = async (reason, level) => {
    try {
      await warnUser.mutateAsync({ userId: user._id, reason, level });
      setShowWarnModal(false);
      setSuccessMessage('Warning issued successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleSuspend = async (reason, until) => {
    try {
      await suspendUser.mutateAsync({ userId: user._id, reason, until });
      setShowSuspendModal(false);
      setSuccessMessage('User suspended successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleUnsuspend = () => {
    setShowUnsuspendDialog(true);
  };

  const handleUnsuspendConfirm = async () => {
    try {
      await unsuspendUser.mutateAsync({ userId: user._id, reason: 'Suspension lifted by admin' });
      setSuccessMessage('User unsuspended successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleBan = async (reason) => {
    try {
      await banUser.mutateAsync({ userId: user._id, reason });
      setShowBanModal(false);
      setSuccessMessage('User banned successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleUnban = () => {
    setShowUnbanDialog(true);
  };

  const handleUnbanConfirm = async () => {
    try {
      await unbanUser.mutateAsync({ userId: user._id, reason: 'Ban lifted by admin' });
      setSuccessMessage('User unbanned successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleAddNote = async (content) => {
    try {
      await addAdminNote.mutateAsync({ userId: user._id, content });
      setShowNoteModal(false);
      setSuccessMessage('Note added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleSendMessage = async ({ subject, message, category, priority }) => {
    try {
      await sendAdminMessage.mutateAsync({ userId: user._id, subject, message, category, priority });
      setShowMessageModal(false);
      setSuccessMessage('Message sent successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Current status cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatusCard
          icon={AlertTriangle}
          label="Warning Count"
          value={moderationStatus.warningCount || 0}
          variant={moderationStatus.warningCount > 0 ? 'warning' : 'default'}
        />
        <StatusCard
          icon={Clock}
          label="Last Warning"
          value={formatDate(moderationStatus.lastWarningAt)}
        />
        <StatusCard
          icon={isBanned ? ShieldX : Ban}
          label="Status"
          value={isBanned ? 'Banned' : isSuspended ? 'Suspended' : user.status === 'active' ? 'Active' : user.status}
          variant={isBanned || isSuspended ? 'danger' : user.status === 'active' ? 'success' : 'default'}
        />
        {isSuspended && moderationStatus.suspendedUntil && (
          <StatusCard
            icon={Clock}
            label="Suspended Until"
            value={formatDate(moderationStatus.suspendedUntil)}
            variant="danger"
          />
        )}
      </div>

      {/* Ban reason */}
      {isBanned && moderationStatus.banReason && (
        <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-600 font-medium mb-1">Ban Reason:</p>
          <p className="text-sm text-red-500">{moderationStatus.banReason}</p>
          {moderationStatus.bannedAt && (
            <p className="text-xs text-red-400 mt-1">
              Banned on: {formatDate(moderationStatus.bannedAt)}
            </p>
          )}
        </div>
      )}

      {/* Suspension reason */}
      {!isBanned && isSuspended && moderationStatus.suspendReason && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-500 font-medium mb-1">Suspension Reason:</p>
          <p className="text-sm text-red-400">{moderationStatus.suspendReason}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={AlertTriangle}
          label="Issue Warning"
          variant="warning"
          onClick={() => setShowWarnModal(true)}
          disabled={user.role === 'admin' || isBanned}
        />
        {isBanned ? (
          <ActionButton
            icon={ShieldCheck}
            label="Unban"
            variant="success"
            onClick={handleUnban}
            disabled={unbanUser.isPending}
          />
        ) : isSuspended ? (
          <ActionButton
            icon={CheckCircle}
            label="Unsuspend"
            variant="success"
            onClick={handleUnsuspend}
            disabled={unsuspendUser.isPending}
          />
        ) : (
          <ActionButton
            icon={Ban}
            label="Suspend"
            variant="danger"
            onClick={() => setShowSuspendModal(true)}
            disabled={user.role === 'admin'}
          />
        )}
        {!isBanned && (
          <ActionButton
            icon={ShieldX}
            label="Ban"
            variant="danger"
            onClick={() => setShowBanModal(true)}
            disabled={user.role === 'admin'}
          />
        )}
        <ActionButton
          icon={MessageSquare}
          label="Add Note"
          onClick={() => setShowNoteModal(true)}
        />
        <ActionButton
          icon={Mail}
          label="Send Message"
          onClick={() => setShowMessageModal(true)}
        />
      </div>

      {user.role === 'admin' && (
        <p className="text-xs text-muted">
          Note: Admin users cannot be warned, suspended, or banned.
        </p>
      )}

      {/* Moderation history */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-bg px-3 py-2 border-b border-border flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted" />
          <h4 className="text-sm font-medium text-text">Moderation History</h4>
          <span className="text-xs text-muted">({data?.total || 0})</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            Failed to load history
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center p-8 text-muted text-sm">
            No moderation history
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {actions.map((action) => (
              <HistoryItem key={action._id} action={action} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showWarnModal && (
        <WarnUserModal
          user={user}
          onClose={() => setShowWarnModal(false)}
          onSubmit={handleWarn}
          isLoading={warnUser.isPending}
          error={warnUser.error}
        />
      )}

      {showSuspendModal && (
        <SuspendUserModal
          user={user}
          onClose={() => setShowSuspendModal(false)}
          onSubmit={handleSuspend}
          isLoading={suspendUser.isPending}
          error={suspendUser.error}
        />
      )}

      {showNoteModal && (
        <AddAdminNoteModal
          user={user}
          onClose={() => setShowNoteModal(false)}
          onSubmit={handleAddNote}
          isLoading={addAdminNote.isPending}
          error={addAdminNote.error}
        />
      )}

      {/* Unsuspend User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showUnsuspendDialog}
        onClose={() => setShowUnsuspendDialog(false)}
        onConfirm={handleUnsuspendConfirm}
        title="Unsuspend User"
        message={`Are you sure you want to lift the suspension for ${user.email}? They will immediately regain access to their account.`}
        confirmText="Unsuspend User"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Ban User Modal */}
      {showBanModal && (
        <BanUserModal
          user={user}
          onClose={() => setShowBanModal(false)}
          onSubmit={handleBan}
          isLoading={banUser.isPending}
          error={banUser.error}
        />
      )}

      {/* Unban User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showUnbanDialog}
        onClose={() => setShowUnbanDialog(false)}
        onConfirm={handleUnbanConfirm}
        title="Unban User"
        message={`Are you sure you want to lift the permanent ban for ${user.email}? They will immediately regain access to their account.`}
        confirmText="Unban User"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Send Admin Message Modal */}
      {showMessageModal && (
        <SendAdminMessageModal
          user={user}
          onClose={() => setShowMessageModal(false)}
          onSubmit={handleSendMessage}
          isLoading={sendAdminMessage.isPending}
          error={sendAdminMessage.error}
        />
      )}
    </div>
  );
}
