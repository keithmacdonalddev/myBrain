import { useState } from 'react';
import { X, ShieldX, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';

export default function BanUserModal({ user, onClose, onSubmit, isLoading, error }) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || !confirmed) return;
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel border border-border rounded-lg shadow-theme-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldX className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Permanently Ban User</h2>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Warning */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Permanent Action</p>
                <p className="text-xs text-red-400 mt-1">
                  Banning is permanent and cannot be automatically reversed. The user will be completely locked out of their account. Only an admin can lift a ban.
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="p-3 bg-bg rounded-lg border border-border">
            <p className="text-xs text-muted mb-1">User being banned:</p>
            <p className="text-sm font-medium text-text">{user.email}</p>
            {user.profile?.displayName && (
              <p className="text-xs text-muted">{user.profile.displayName}</p>
            )}
            {user.moderationStatus?.warningCount > 0 && (
              <p className="text-xs text-yellow-500 mt-1">
                {user.moderationStatus.warningCount} warning(s) on record
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Ban Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this user is being permanently banned..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
            <p className="text-xs text-muted mt-1">
              This reason will be logged and shown to the user if they try to log in.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border bg-bg text-red-500 focus:ring-red-500"
            />
            <span className="text-sm text-muted">
              I understand this action is permanent and the user will be completely locked out of their account.
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim() || !confirmed}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Banning...
                </>
              ) : (
                <>
                  <ShieldX className="w-4 h-4" />
                  Ban User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
