/**
 * SessionCard Component
 *
 * Displays a single session with device info, location, and activity.
 * Includes revoke button for non-current sessions with proper ARIA labels.
 */
import { MapPin } from 'lucide-react';
import DeviceIcon from './DeviceIcon';
import { getRelativeDate } from '../../../lib/dateUtils';

/**
 * Session card displaying device, location, and activity info
 *
 * @param {Object} props - Component props
 * @param {Object} props.session - Session data object
 * @param {Function} props.onRevoke - Callback when revoke button is clicked
 * @param {boolean} props.isRevoking - Whether revoke is in progress
 * @param {boolean} props.showRevoke - Whether to show revoke button (default: true)
 */
export default function SessionCard({
  session,
  onRevoke,
  isRevoking = false,
  showRevoke = true,
}) {
  // Extract device and location info with fallbacks
  const device = session.device || {};
  const location = session.location || {};

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Device and location info */}
        <div className="flex items-start gap-3">
          {/* Device icon */}
          <div className="p-2.5 rounded-lg bg-bg">
            <DeviceIcon
              type={device.type}
              className="w-5 h-5 text-muted"
            />
          </div>

          {/* Session details */}
          <div>
            {/* Device name with current session badge */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-text">
                {device.display || device.browser || 'Unknown Device'}
              </span>
              {session.isCurrent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[var(--success)] text-white rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  This Session
                </span>
              )}
            </div>

            {/* Location info */}
            <div className="flex items-center gap-2 mt-1 text-sm text-muted">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location.display || location.city || 'Unknown location'}</span>
            </div>

            {/* Last activity time */}
            <p className="text-xs text-muted mt-1">
              {session.isCurrent
                ? 'Active now'
                : `Last active ${getRelativeDate(session.lastActivityAt)}`}
            </p>
          </div>
        </div>

        {/* Revoke button (only shown for non-current sessions) */}
        {showRevoke && !session.isCurrent && (
          <button
            onClick={onRevoke}
            disabled={isRevoking}
            aria-label={`Revoke session on ${device.display || device.browser || 'unknown device'} in ${location.display || location.city || 'unknown location'}`}
            className="px-3 py-1.5 text-sm text-[var(--danger)] border border-[var(--danger)]/30 rounded-lg hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-50"
          >
            {isRevoking ? 'Revoking...' : 'Revoke'}
          </button>
        )}
      </div>
    </div>
  );
}
