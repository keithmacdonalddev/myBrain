/**
 * LoginHistory Component
 *
 * Displays paginated table of past login attempts with status.
 * Shows device, location, and time for each login.
 */
import { ChevronLeft, ChevronRight, LogIn, XCircle, CheckCircle } from 'lucide-react';
import { useLoginHistory } from '../hooks/useLoginHistory';
import DeviceIcon from './DeviceIcon';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/dateUtils';

/**
 * Login history table with pagination
 */
export default function LoginHistory() {
  const {
    logins,
    total,
    isLoading,
    page,
    totalPages,
    hasMore,
    hasPrevious,
    nextPage,
    previousPage,
  } = useLoginHistory();

  // Loading state
  if (isLoading && logins.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton.List count={5} />
      </div>
    );
  }

  // Empty state
  if (logins.length === 0) {
    return (
      <EmptyState
        icon={LogIn}
        title="No login history"
        description="Your login history will appear here once you sign in to your account."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <p className="text-muted text-sm">{total} login{total !== 1 ? 's' : ''} recorded</p>
      </div>

      {/* Login history table */}
      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border-b border-border text-xs font-medium text-muted uppercase tracking-wide">
          <div className="col-span-4">Device</div>
          <div className="col-span-3">Location</div>
          <div className="col-span-3">Time</div>
          <div className="col-span-2">Status</div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-border">
          {logins.map((login) => (
            <div
              key={login.id}
              className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-bg/50 transition-colors"
            >
              {/* Device */}
              <div className="col-span-4 flex items-center gap-3">
                <DeviceIcon type={login.device?.type} className="w-4 h-4 text-muted" />
                <span className="text-sm text-text truncate">
                  {login.device?.display || login.device?.browser || 'Unknown device'}
                </span>
              </div>

              {/* Location */}
              <div className="col-span-3 text-sm text-muted truncate">
                {login.location?.display || login.location?.city || 'Unknown'}
              </div>

              {/* Time */}
              <div className="col-span-3 text-sm text-muted">
                {formatDate(login.timestamp, { includeTime: true })}
              </div>

              {/* Status */}
              <div className="col-span-2">
                {login.success ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--success)]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--danger)]">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={previousPage}
              disabled={!hasPrevious}
              aria-label="Previous page"
              className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPage}
              disabled={!hasMore}
              aria-label="Next page"
              className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
