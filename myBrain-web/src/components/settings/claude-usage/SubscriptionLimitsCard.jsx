/**
 * =============================================================================
 * SUBSCRIPTIONLIMITSCARD.JSX - Claude Subscription Limits Display
 * =============================================================================
 *
 * Displays subscription usage limits from Claude Code's /usage command:
 * - Session usage (resets daily)
 * - Weekly usage (all models)
 * - Weekly usage (Sonnet only)
 *
 * Each limit is shown as a progress bar with color coding:
 * - Green (0-60%): Healthy usage
 * - Yellow (60-85%): Approaching limit
 * - Red (85-100%): Near/at limit
 *
 * =============================================================================
 */

import { useState } from 'react';
import { Gauge, Clock, X, AlertTriangle, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useClaudeSubscription } from '../../../hooks/useClaudeUsage';

// localStorage key for dismiss preference
const STORAGE_KEY = 'hideSubscriptionLimits';

/**
 * SubscriptionLimitsCard
 * ----------------------
 * Displays current subscription limit usage as progress bars
 */
export default function SubscriptionLimitsCard() {
  const { data: snapshot, isLoading, error } = useClaudeSubscription();

  // Visibility state
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleRestore = () => {
    setIsVisible(true);
    localStorage.removeItem(STORAGE_KEY);
  };

  // If dismissed, show restore link
  if (!isVisible) {
    return (
      <button
        onClick={handleRestore}
        className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
      >
        <Gauge className="w-4 h-4" />
        Show subscription limits
      </button>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-panel rounded-xl border border-border p-5 animate-pulse">
        <div className="h-6 w-40 bg-panel2 rounded mb-4" />
        <div className="space-y-4">
          <div className="h-16 bg-panel2 rounded" />
          <div className="h-16 bg-panel2 rounded" />
          <div className="h-16 bg-panel2 rounded" />
        </div>
      </div>
    );
  }

  // No data state
  if (!snapshot) {
    return (
      <div className="bg-panel rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Subscription Limits
          </h3>
          <button
            onClick={handleDismiss}
            className="p-1 text-muted hover:text-text hover:bg-bg/50 rounded transition-colors"
            title="Hide subscription limits"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted bg-bg/50 rounded-lg p-4">
          <Info className="w-5 h-5 flex-shrink-0" />
          <p>
            No subscription data yet. Run <code className="text-primary">/claude-usage</code> skill
            and include subscription limits from the <code className="text-primary">/usage</code> command.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-panel rounded-xl border border-border p-5">
        <div className="text-sm text-danger flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Failed to load subscription data
        </div>
      </div>
    );
  }

  const { session, weeklyAllModels, weeklySonnet, capturedAt } = snapshot;

  return (
    <div className="bg-panel rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          Subscription Limits
        </h3>
        <div className="flex items-center gap-3">
          {capturedAt && (
            <span className="text-xs text-muted">
              Updated {formatDistanceToNow(new Date(capturedAt), { addSuffix: true })}
            </span>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 text-muted hover:text-text hover:bg-bg/50 rounded transition-colors"
            title="Hide subscription limits"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Session Usage */}
        <LimitBar
          label="Session Usage"
          percent={session?.usedPercent ?? 0}
          resetInfo={session?.resetTime ? `Resets ${session.resetTime} (${session.resetTimezone})` : null}
        />

        {/* Weekly All Models */}
        <LimitBar
          label="Weekly (All Models)"
          percent={weeklyAllModels?.usedPercent ?? 0}
          resetInfo={weeklyAllModels?.resetDate ? `Resets ${format(new Date(weeklyAllModels.resetDate), 'MMM d, h:mma')}` : null}
        />

        {/* Weekly Sonnet */}
        <LimitBar
          label="Weekly (Sonnet Only)"
          percent={weeklySonnet?.usedPercent ?? 0}
          resetInfo={weeklySonnet?.resetDate ? `Resets ${format(new Date(weeklySonnet.resetDate), 'MMM d, h:mma')}` : null}
        />
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-border text-xs text-muted flex items-center gap-2">
        <Info className="w-3.5 h-3.5" />
        Run <code className="text-primary">/claude-usage</code> to update limits
      </div>
    </div>
  );
}

/**
 * LimitBar
 * --------
 * Individual progress bar for a usage limit
 */
function LimitBar({ label, percent, resetInfo }) {
  // Ensure percent is valid
  const safePercent = Math.max(0, Math.min(100, percent ?? 0));

  // Color based on usage level
  const getColor = (pct) => {
    if (pct >= 85) return { bar: 'bg-danger', text: 'text-danger' };
    if (pct >= 60) return { bar: 'bg-warning', text: 'text-warning' };
    return { bar: 'bg-success', text: 'text-success' };
  };

  const colors = getColor(safePercent);

  return (
    <div className="bg-bg/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{label}</span>
        {resetInfo && (
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {resetInfo}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-panel2 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${safePercent}%` }}
        />
      </div>

      {/* Percentage label */}
      <div className={`text-right text-sm font-bold mt-1 ${colors.text}`}>
        {safePercent}% used
      </div>
    </div>
  );
}
