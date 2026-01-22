/**
 * =============================================================================
 * SINCELASTSYNCCARD.JSX - Sync Comparison Card
 * =============================================================================
 *
 * Shows delta/comparison data from the most recent Claude usage sync.
 * Displays cost change, token change, and time since last sync.
 * User can dismiss the card; preference persists to localStorage.
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  DollarSign,
  Cpu,
  Calendar,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { formatCurrency, formatNumber } from '../../../lib/utils';

// localStorage key for dismiss preference
const STORAGE_KEY = 'hideSinceLastSync';

/**
 * SinceLastSyncCard
 * -----------------
 * Displays comparison between the two most recent syncs
 * Can be dismissed by user; shows restore link when hidden
 *
 * @param {Object} latestSync - Latest sync event with comparison data
 */
export default function SinceLastSyncCard({ latestSync }) {
  // Visibility state - reads from localStorage on mount
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  // Dismiss handler - hides card and saves preference
  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // Restore handler - shows card and clears preference
  const handleRestore = () => {
    setIsVisible(true);
    localStorage.removeItem(STORAGE_KEY);
  };

  // If no sync data, no comparison, or no deltas, don't render
  if (!latestSync?.comparison?.deltaFromPrevious || !latestSync?.summary) {
    return null;
  }

  // If dismissed, show restore link
  if (!isVisible) {
    return (
      <button
        onClick={handleRestore}
        className="text-sm text-primary hover:underline mb-2 flex items-center gap-1"
      >
        <Clock className="w-4 h-4" />
        Show sync comparison
      </button>
    );
  }

  const { summary, comparison, syncedAt } = latestSync;
  const { deltaFromPrevious } = comparison;

  // Safely get delta values with defaults
  const costDelta = deltaFromPrevious.costDelta ?? 0;
  const tokenDelta = deltaFromPrevious.tokensDelta ?? 0;
  const daysDelta = deltaFromPrevious.daysDelta ?? 0;
  const inputTokensDelta = deltaFromPrevious.inputTokensDelta ?? 0;
  const outputTokensDelta = deltaFromPrevious.outputTokensDelta ?? 0;

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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {formatDistanceToNow(new Date(syncedAt), { addSuffix: true })}
          </span>
          <button
            onClick={handleDismiss}
            className="p-1 text-muted hover:text-text hover:bg-bg/50 rounded transition-colors"
            title="Hide sync comparison"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        {/* Input Tokens Delta */}
        <DeltaCard
          icon={ArrowDownToLine}
          label="Input Tokens"
          delta={inputTokensDelta}
          format="number"
          color="green"
        />

        {/* Output Tokens Delta */}
        <DeltaCard
          icon={ArrowUpFromLine}
          label="Output Tokens"
          delta={outputTokensDelta}
          format="number"
          color="purple"
        />
      </div>

      {/* Secondary info row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {/* Days Delta */}
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted">Days Added</span>
          </div>
          <div className="text-lg font-bold text-text">
            {daysDelta > 0 ? '+' : ''}{daysDelta} day{daysDelta !== 1 ? 's' : ''}
          </div>
        </div>

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

        {/* Date Range */}
        {summary.dateRange && (
          <div className="bg-bg/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-cyan-500" />
              <span className="text-xs text-muted">Date Range</span>
            </div>
            <div className="text-sm font-bold text-text">
              {formatDateRange(summary.dateRange.start, summary.dateRange.end)}
            </div>
          </div>
        )}
      </div>

      {/* Footer with totals, cache stats, and models */}
      <div className="mt-4 pt-4 border-t border-primary/20 space-y-3">
        {/* Current totals row */}
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
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

        {/* Cache stats row */}
        {(summary.totalCacheCreationTokens > 0 || summary.totalCacheReadTokens > 0) && (
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-muted" />
            <span className="text-muted">Cache:</span>
            <span className="text-text">
              {formatNumber(summary.totalCacheCreationTokens ?? 0)} created
            </span>
            <span className="text-muted">·</span>
            <span className="text-text">
              {formatNumber(summary.totalCacheReadTokens ?? 0)} read
            </span>
          </div>
        )}

        {/* Models used row */}
        {summary.modelsUsed && summary.modelsUsed.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted">Models:</span>
            <div className="flex flex-wrap gap-1.5">
              {summary.modelsUsed.map((model) => (
                <span
                  key={model}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  {formatModelName(model)}
                </span>
              ))}
            </div>
          </div>
        )}
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

/**
 * Format date range in human-readable form
 * Shows "Jan 17 - Jan 22" style, or just "Jan 17" if same day
 */
function formatDateRange(startStr, endStr) {
  if (!startStr || !endStr) return '';

  const start = new Date(startStr);
  const end = new Date(endStr);

  // Same day - just show one date
  if (start.toDateString() === end.toDateString()) {
    return format(start, 'MMM d');
  }

  // Same year - don't repeat year
  if (start.getFullYear() === end.getFullYear()) {
    // Same month - just show "Jan 17 - 22"
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')} - ${format(end, 'd')}`;
    }
    // Different months - show "Jan 17 - Feb 22"
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  }

  // Different years - show full dates
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Format model name to friendly display
 * "claude-sonnet-4-5-20250929" -> "Sonnet 4.5"
 */
function formatModelName(model) {
  if (!model) return model;

  // Extract model family and version from Claude model strings
  // Pattern: claude-{family}-{version}-{date}
  const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
  if (match) {
    const family = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const version = `${match[2]}.${match[3]}`;
    return `${family} ${version}`;
  }

  // Fallback: just capitalize and clean up
  return model.replace(/claude-/i, '').replace(/-/g, ' ');
}
