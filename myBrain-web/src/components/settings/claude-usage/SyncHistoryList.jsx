/**
 * =============================================================================
 * SYNCHISTORYLIST.JSX - Sync History List Component
 * =============================================================================
 *
 * Lists past Claude usage sync events with summaries and comparisons.
 * Supports expandable details and limit selection.
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Cpu,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useClaudeUsageSyncs } from '../../../hooks/useClaudeUsage';
import { formatCurrency, formatNumber } from '../../../lib/utils';
import Skeleton from '../../ui/Skeleton';

/**
 * SyncHistoryList
 * ---------------
 * Shows chronological list of past sync events
 */
export default function SyncHistoryList() {
  const [limit, setLimit] = useState(10);
  const [expandedSyncId, setExpandedSyncId] = useState(null);

  const { data, isLoading, error } = useClaudeUsageSyncs(limit);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger text-sm">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (!data?.syncs || data.syncs.length === 0) {
    return (
      <div className="text-center py-12 bg-bg rounded-xl border border-border">
        <History className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-text mb-2">No Sync History</h3>
        <p className="text-sm text-muted">
          Run <code className="px-2 py-0.5 bg-panel text-primary rounded text-xs">/claude-usage</code> to start tracking
        </p>
      </div>
    );
  }

  const { syncs } = data;

  return (
    <div className="space-y-4">
      {/* Header with limit selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Sync History
        </h3>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value={10}>Last 10</option>
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
        </select>
      </div>

      {/* Sync list */}
      <div className="space-y-3">
        {syncs.map((sync, index) => (
          <SyncHistoryItem
            key={sync._id}
            sync={sync}
            isLatest={index === 0}
            isExpanded={expandedSyncId === sync._id}
            onToggle={() => setExpandedSyncId(
              expandedSyncId === sync._id ? null : sync._id
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * SyncHistoryItem
 * ---------------
 * Individual sync event in the history list
 */
function SyncHistoryItem({ sync, isLatest, isExpanded, onToggle }) {
  const { summary, comparison, syncedAt, modelBreakdown } = sync;

  return (
    <div className="bg-bg rounded-xl border border-border overflow-hidden">
      {/* Main row - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-panel/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Date/Time */}
          <div className="min-w-[120px]">
            <div className="text-sm font-medium text-text">
              {format(new Date(syncedAt), 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-muted">
              {format(new Date(syncedAt), 'h:mm a')}
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-text">
                {formatCurrency(summary.totalCost)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted">
                {formatNumber(summary.totalTokens)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted">
                {summary.daysIncluded} days
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Delta indicator if there's comparison data */}
          {comparison?.deltas && (
            <DeltaIndicator delta={comparison.deltas.totalCost} />
          )}

          {/* Latest badge */}
          {isLatest && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
              Latest
            </span>
          )}

          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {/* Model breakdown */}
          {modelBreakdown && Object.keys(modelBreakdown).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text mb-2">Model Usage</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(modelBreakdown).map(([model, data]) => (
                  <div
                    key={model}
                    className="bg-panel rounded-lg p-2 text-sm"
                  >
                    <div className="font-medium text-text truncate" title={model}>
                      {model}
                    </div>
                    <div className="text-muted text-xs">
                      {formatCurrency(data.cost)} ({formatNumber(data.tokens)} tokens)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison with previous sync */}
          {comparison?.previousSync && (
            <div>
              <h4 className="text-sm font-medium text-text mb-2">Change from Previous Sync</h4>
              <div className="grid grid-cols-3 gap-3">
                <ComparisonItem
                  label="Cost"
                  previous={comparison.previousSync.totalCost}
                  current={summary.totalCost}
                  delta={comparison.deltas.totalCost}
                  format="currency"
                />
                <ComparisonItem
                  label="Tokens"
                  previous={comparison.previousSync.totalTokens}
                  current={summary.totalTokens}
                  delta={comparison.deltas.totalTokens}
                  format="number"
                />
                <ComparisonItem
                  label="Days"
                  previous={comparison.previousSync.daysIncluded}
                  current={summary.daysIncluded}
                  delta={comparison.deltas.daysIncluded}
                  format="plain"
                />
              </div>
            </div>
          )}

          {/* Date range covered */}
          <div className="text-xs text-muted">
            Covering {format(new Date(summary.dateRange?.start || syncedAt), 'MMM d')} - {format(new Date(summary.dateRange?.end || syncedAt), 'MMM d, yyyy')}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * DeltaIndicator
 * --------------
 * Small indicator showing if cost went up/down
 */
function DeltaIndicator({ delta }) {
  if (delta > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-500">
        <ArrowUp className="w-3 h-3" />
        +{formatCurrency(delta)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <ArrowDown className="w-3 h-3" />
        {formatCurrency(delta)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted">
      <Minus className="w-3 h-3" />
      No change
    </span>
  );
}

/**
 * ComparisonItem
 * --------------
 * Shows before/after comparison for a metric
 */
function ComparisonItem({ label, previous, current, delta, format: formatType }) {
  const formatValue = (value) => {
    switch (formatType) {
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      default:
        return value;
    }
  };

  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className="bg-panel/50 rounded-lg p-2">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{formatValue(previous)}</span>
        <span className="text-muted mx-1">&rarr;</span>
        <span className="text-sm font-medium text-text">{formatValue(current)}</span>
      </div>
      <div className={`text-xs mt-1 ${
        isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted'
      }`}>
        {isPositive ? '+' : ''}{formatValue(delta)}
      </div>
    </div>
  );
}
