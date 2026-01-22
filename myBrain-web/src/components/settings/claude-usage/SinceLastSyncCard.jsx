/**
 * =============================================================================
 * SINCELASTSYNCCARD.JSX - Sync Comparison Card
 * =============================================================================
 *
 * Shows delta/comparison data from the most recent Claude usage sync.
 * Displays cost change, token change, and time since last sync.
 *
 * =============================================================================
 */

import { ArrowUp, ArrowDown, Minus, Clock, DollarSign, Cpu, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency, formatNumber } from '../../../lib/utils';

/**
 * SinceLastSyncCard
 * -----------------
 * Displays comparison between the two most recent syncs
 *
 * @param {Object} latestSync - Latest sync event with comparison data
 */
export default function SinceLastSyncCard({ latestSync }) {
  // If no sync data, no comparison, or no deltas, don't render
  if (!latestSync?.comparison?.deltas || !latestSync?.summary) {
    return null;
  }

  const { summary, comparison, syncedAt } = latestSync;
  const { deltas } = comparison;

  // Safely get delta values with defaults
  const costDelta = deltas.totalCost ?? 0;
  const tokenDelta = deltas.totalTokens ?? 0;
  const daysDelta = deltas.daysIncluded ?? 0;

  // Calculate percentage changes (only if previous sync exists)
  const costChangePercent = comparison.previousSync?.totalCost > 0
    ? ((costDelta / comparison.previousSync.totalCost) * 100).toFixed(1)
    : null;

  const tokenChangePercent = comparison.previousSync?.totalTokens > 0
    ? ((tokenDelta / comparison.previousSync.totalTokens) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Since Last Sync
        </h3>
        <span className="text-sm text-muted">
          {formatDistanceToNow(new Date(syncedAt), { addSuffix: true })}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cost Delta */}
        <DeltaCard
          icon={DollarSign}
          label="Cost Change"
          delta={costDelta}
          percent={costChangePercent}
          format="currency"
          color="primary"
        />

        {/* Token Delta */}
        <DeltaCard
          icon={Cpu}
          label="Tokens Change"
          delta={tokenDelta}
          percent={tokenChangePercent}
          format="number"
          color="blue"
        />

        {/* Days Delta */}
        <DeltaCard
          icon={Calendar}
          label="Days Added"
          delta={daysDelta}
          format="days"
          color="green"
        />

        {/* Time Between Syncs */}
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted">Sync Interval</span>
          </div>
          <div className="text-lg font-bold text-text">
            {comparison.timeBetweenSyncs
              ? formatSyncInterval(comparison.timeBetweenSyncs)
              : 'First sync'}
          </div>
        </div>
      </div>

      {/* Current totals summary */}
      <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between text-sm flex-wrap gap-2">
        <span className="text-muted">Current totals:</span>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-text font-medium">
            {formatCurrency(summary.totalCost ?? 0)} total
          </span>
          <span className="text-muted hidden sm:inline">|</span>
          <span className="text-text font-medium">
            {formatNumber(summary.totalTokens ?? 0)} tokens
          </span>
          <span className="text-muted hidden sm:inline">|</span>
          <span className="text-text font-medium">
            {summary.daysIncluded ?? 0} days
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * DeltaCard
 * ---------
 * Individual delta metric with up/down indicator
 */
function DeltaCard({ icon: Icon, label, delta = 0, percent, format, color }) {
  const safeValue = delta ?? 0;
  const isPositive = safeValue > 0;
  const isNegative = safeValue < 0;
  const isZero = safeValue === 0;

  // Format the delta value based on type
  const formatValue = (value) => {
    if (value === 0 || value == null) return '0';
    const absValue = Math.abs(value);
    switch (format) {
      case 'currency':
        return formatCurrency(absValue);
      case 'number':
        return formatNumber(absValue);
      case 'days':
        return `${absValue} day${absValue !== 1 ? 's' : ''}`;
      default:
        return absValue.toString();
    }
  };

  // Colors for different states
  const colorClasses = {
    primary: 'text-primary',
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
  };

  return (
    <div className="bg-bg/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colorClasses[color]}`} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {isPositive && <ArrowUp className="w-4 h-4 text-green-500" />}
        {isNegative && <ArrowDown className="w-4 h-4 text-red-500" />}
        {isZero && <Minus className="w-4 h-4 text-muted" />}
        <span className={`text-lg font-bold ${
          isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted'
        }`}>
          {isPositive ? '+' : ''}{formatValue(safeValue)}
        </span>
      </div>
      {percent && (
        <div className={`text-xs mt-1 ${
          isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted'
        }`}>
          {isPositive ? '+' : ''}{percent}%
        </div>
      )}
    </div>
  );
}

/**
 * Format sync interval in human-readable form
 */
function formatSyncInterval(ms) {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) {
    return `${Math.round(ms / (1000 * 60))} min`;
  }
  if (hours < 24) {
    return `${Math.round(hours)} hr`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}
