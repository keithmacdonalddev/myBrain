/**
 * SessionCard Component
 *
 * Displays a single session with progressive disclosure design:
 * - Collapsed view (default): Device name, location, last activity, action buttons
 * - Expanded view: Browser/OS details, IP, timezone, session timeline, security badges
 *
 * Includes smooth expand/collapse animation and follows design system.
 */
import { useState } from 'react';
import {
  MapPin,
  ChevronDown,
  Clock,
  Globe,
  Calendar,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import DeviceIcon from './DeviceIcon';
import { getRelativeDate, formatDateTime } from '../../../lib/dateUtils';

/**
 * Session card with progressive disclosure
 *
 * @param {Object} props - Component props
 * @param {Object} props.session - Session data object with extended info
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract device and location info with fallbacks
  // Handle both string format (from backend) and object format
  const device = session.device || {};
  const location = session.location || {};

  // Device display: use string directly, or fall back to object properties
  const deviceDisplay = typeof device === 'string'
    ? device
    : (device.display || device.browser || 'Unknown Device');

  // Location display: use string directly, or fall back to object properties
  const locationDisplay = typeof location === 'string'
    ? location
    : (location.display || location.city || 'Unknown location');

  // Device type for icon (only available if object, otherwise use session.deviceType)
  const deviceType = typeof device === 'string' ? session.deviceType : device.type;

  // Check for security flags
  const hasSecurityFlags = session.securityFlags?.isNewDevice || session.securityFlags?.isNewLocation;

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg overflow-hidden transition-shadow hover:shadow-theme-elevated">
      {/* Main collapsed content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Device and location info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Device icon */}
            <div className="p-2.5 rounded-lg bg-[var(--bg)] flex-shrink-0">
              <DeviceIcon
                type={deviceType}
                className="w-5 h-5 text-[var(--muted)]"
              />
            </div>

            {/* Session details */}
            <div className="flex-1 min-w-0">
              {/* Device name with current session badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[var(--text)] truncate">
                  {deviceDisplay}
                </span>
                {session.isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[var(--success)] text-white rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    This Session
                  </span>
                )}
                {/* Security badges in collapsed view (subtle) */}
                {hasSecurityFlags && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {session.securityFlags?.isNewDevice && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30 rounded">
                        New Device
                      </span>
                    )}
                    {session.securityFlags?.isNewLocation && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30 rounded">
                        New Location
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Location info */}
              <div className="flex items-center gap-2 mt-1 text-sm text-[var(--muted)]">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{locationDisplay}</span>
              </div>

              {/* Last activity time */}
              <p className="text-xs text-[var(--muted)] mt-1">
                {session.isCurrent
                  ? 'Active now'
                  : `Last active ${getRelativeDate(session.lastActivityAt)}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* More/Less button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Show less details' : 'Show more details'}
              className="px-3 py-1.5 text-sm text-[var(--muted)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors flex items-center gap-1.5"
            >
              <span>{isExpanded ? 'Less' : 'More'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Revoke button (only shown for non-current sessions) */}
            {showRevoke && !session.isCurrent && (
              <button
                onClick={onRevoke}
                disabled={isRevoking}
                aria-label={`Revoke session on ${deviceDisplay} in ${locationDisplay}`}
                className="px-3 py-1.5 text-sm text-[var(--danger)] border border-[var(--danger)]/30 rounded-lg hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-50"
              >
                {isRevoking ? 'Revoking...' : 'Revoke'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details section */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-0">
          {/* Divider */}
          <div className="h-px bg-[var(--border)] mb-4" />

          {/* Extended details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Browser & OS Details */}
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-[var(--bg)]">
                <Globe className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-0.5">
                  Browser & OS
                </p>
                <p className="text-sm text-[var(--text)]">
                  {session.browserDetail || 'Unknown Browser'}
                </p>
                <p className="text-sm text-[var(--text)]">
                  {session.osDetail || 'Unknown OS'}
                </p>
              </div>
            </div>

            {/* IP Address (masked) */}
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-[var(--bg)]">
                <Shield className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-0.5">
                  IP Address
                </p>
                <p className="text-sm text-[var(--text)] font-mono">
                  {session.ipMasked || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Timezone */}
            {session.timezone && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded bg-[var(--bg)]">
                  <Clock className="w-4 h-4 text-[var(--muted)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-0.5">
                    Timezone
                  </p>
                  <p className="text-sm text-[var(--text)]">
                    {session.timezone}
                  </p>
                </div>
              </div>
            )}

            {/* Session Timeline */}
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-[var(--bg)]">
                <Calendar className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-0.5">
                  Session Timeline
                </p>
                <div className="space-y-0.5">
                  <p className="text-sm text-[var(--text)]">
                    <span className="text-[var(--muted)]">Created:</span>{' '}
                    {session.issuedAt ? formatDateTime(session.issuedAt) : 'Unknown'}
                  </p>
                  <p className="text-sm text-[var(--text)]">
                    <span className="text-[var(--muted)]">Last active:</span>{' '}
                    {session.lastActivityAt ? formatDateTime(session.lastActivityAt) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Flags Warning (if any) */}
          {hasSecurityFlags && (
            <div className="mt-4 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--warning)]">
                    Security Notice
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {session.securityFlags?.isNewDevice && session.securityFlags?.isNewLocation
                      ? 'This session was created from a new device and location.'
                      : session.securityFlags?.isNewDevice
                      ? 'This session was created from a device we haven\'t seen before.'
                      : 'This session was created from a new location.'}
                    {' '}If this wasn't you, revoke this session immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
