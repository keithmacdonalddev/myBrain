/**
 * =============================================================================
 * CLAUDEUSAGESETTINGS.JSX - Claude Code Usage Settings Component
 * =============================================================================
 *
 * Displays Claude Code token usage and cost statistics including:
 * - Summary cards (total cost, tokens, avg daily cost)
 * - Model distribution breakdown
 * - Recent activity table
 * - Sync instructions
 *
 * NEW: Tabbed interface with Overview, Sync History, and Trends views
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  Activity,
  DollarSign,
  Cpu,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Database,
  Zap,
  Copy,
  Check,
  Info,
  History,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useClaudeUsage,
  useClaudeUsageLastSync,
  useClaudeUsageLatestSync
} from '../../hooks/useClaudeUsage';
import Skeleton from '../ui/Skeleton';
import { formatCurrency, formatNumber } from '../../lib/utils';
import {
  SinceLastSyncCard,
  SyncHistoryList,
  CostTrendChart,
  ModelUsageTrends
} from './claude-usage';

/**
 * Tab definitions for the usage dashboard
 */
const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'history', label: 'Sync History', icon: History },
  { id: 'trends', label: 'Trends', icon: BarChart3 },
];

/**
 * ClaudeUsageSettings
 * -------------------
 * Main Claude Code usage settings component for the Settings page
 */
export default function ClaudeUsageSettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState(1); // Default to Today
  const [showInstructions, setShowInstructions] = useState(false);

  const { data: stats, isLoading, error } = useClaudeUsage(period);
  const { data: lastSync } = useClaudeUsageLastSync();
  const { data: latestSyncData } = useClaudeUsageLatestSync();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-danger mb-3" />
        <h3 className="text-lg font-semibold text-text mb-2">Failed to Load Usage Data</h3>
        <p className="text-sm text-muted max-w-md">
          {error.message || 'Unable to fetch Claude Code usage statistics. Please try again later.'}
        </p>
      </div>
    );
  }

  // Empty state
  if (!stats || stats.daysTracked === 0) {
    return <EmptyState period={period} setPeriod={setPeriod} showInstructions={showInstructions} setShowInstructions={setShowInstructions} />;
  }

  const { totals, modelDistribution, averageDailyCost, daysTracked } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text">Claude Code Usage</h2>
        {lastSync?.lastSyncAt && (
          <p className="text-sm text-muted mt-1">
            Last synced {formatDistanceToNow(new Date(lastSync.lastSyncAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Sync Status Warning */}
      <SyncStatusCard lastSync={lastSync} />

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-bg rounded-lg border border-border p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-text hover:bg-panel/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          stats={stats}
          totals={totals}
          modelDistribution={modelDistribution}
          averageDailyCost={averageDailyCost}
          daysTracked={daysTracked}
          period={period}
          setPeriod={setPeriod}
          latestSyncData={latestSyncData}
          showInstructions={showInstructions}
          setShowInstructions={setShowInstructions}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab />
      )}

      {activeTab === 'trends' && (
        <TrendsTab />
      )}
    </div>
  );
}

/**
 * OverviewTab
 * -----------
 * Main overview with summary cards, model distribution, and sync card
 */
function OverviewTab({
  stats,
  totals,
  modelDistribution,
  averageDailyCost,
  daysTracked,
  period,
  setPeriod,
  latestSyncData,
  showInstructions,
  setShowInstructions
}) {
  return (
    <div className="space-y-8">
      {/* Since Last Sync Card - NEW */}
      {latestSyncData && <SinceLastSyncCard latestSync={latestSyncData} />}

      {/* Period Selector */}
      <PeriodSelector period={period} onChange={setPeriod} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={DollarSign}
          label="Total Cost"
          value={formatCurrency(totals.totalCost)}
          color="primary"
        />
        <SummaryCard
          icon={Cpu}
          label="Total Tokens"
          value={formatNumber(totals.totalTokens)}
          color="blue"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Avg Daily Cost"
          value={formatCurrency(averageDailyCost)}
          color="green"
        />
        <SummaryCard
          icon={Calendar}
          label="Days Tracked"
          value={daysTracked.toString()}
          color="purple"
        />
      </div>

      {/* Model Distribution */}
      <ModelDistribution distribution={modelDistribution} totalCost={totals.totalCost} />

      {/* Token Breakdown */}
      <TokenBreakdown totals={totals} />

      {/* Sync Instructions */}
      <div className="bg-bg rounded-xl border border-border p-4">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-medium text-text">How to Update Usage Data</span>
          </div>
          {showInstructions ? (
            <ChevronUp className="w-5 h-5 text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted" />
          )}
        </button>

        {showInstructions && (
          <div className="mt-4 pt-4 border-t border-border text-sm text-muted space-y-2 px-1">
            <p>To sync your latest Claude Code usage data:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open Claude Code CLI in your terminal</li>
              <li>Run: <code className="px-2 py-0.5 bg-panel text-primary rounded text-xs">/claude-usage</code></li>
              <li>Follow the prompts to authenticate and sync</li>
              <li>Refresh this page to see updated statistics</li>
            </ol>
            <p className="pt-2">
              <strong>Note:</strong> The skill fetches usage data from <code className="text-xs">npx ccusage daily --json</code> and
              sends it to myBrain's API for storage and analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * HistoryTab
 * ----------
 * Sync history view
 */
function HistoryTab() {
  return (
    <div className="space-y-6">
      <SyncHistoryList />
    </div>
  );
}

/**
 * TrendsTab
 * ---------
 * Charts and trend analysis
 */
function TrendsTab() {
  return (
    <div className="space-y-8">
      <CostTrendChart />
      <ModelUsageTrends />
    </div>
  );
}

/**
 * EmptyState
 * ----------
 * Shown when no usage data exists yet
 */
function EmptyState({ period, setPeriod, showInstructions, setShowInstructions }) {
  const [commandCopied, setCommandCopied] = useState(false);

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText('/claude-usage');
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PeriodSelector period={period} onChange={setPeriod} />
      <div className="text-center py-12 bg-bg rounded-xl border border-border">
        <Activity className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-text mb-2">No Usage Data Yet</h3>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          Sync your Claude Code usage data to track tokens and costs over time.
        </p>

        {/* Copy command button */}
        <div className="max-w-md mx-auto mb-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-panel border border-border rounded-lg text-sm font-mono text-primary">
              /claude-usage
            </code>
            <button
              onClick={handleCopyCommand}
              className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {commandCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-muted mt-2 text-left">
            Run this command in your Claude Code terminal to sync your usage data
          </p>
        </div>

        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-primary hover:underline text-sm font-medium"
        >
          View Setup Instructions
        </button>
        {showInstructions && <SyncInstructions onClose={() => setShowInstructions(false)} />}
      </div>
    </div>
  );
}

/**
 * PeriodSelector
 * --------------
 * Tab selector for 7d/30d/90d periods
 */
function PeriodSelector({ period, onChange }) {
  const periods = [
    { value: 1, label: 'Today' },
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];

  return (
    <div className="flex gap-2">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${period === p.value
              ? 'bg-primary text-white'
              : 'bg-bg border border-border text-muted hover:text-text hover:border-text/20'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * SummaryCard
 * -----------
 * Individual summary metric card
 */
function SummaryCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-bg rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-text mb-1">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

/**
 * ModelDistribution
 * -----------------
 * Shows cost breakdown by model with visual bars
 */
function ModelDistribution({ distribution, totalCost }) {
  if (!distribution || Object.keys(distribution).length === 0) {
    return null;
  }

  // Sort models by cost (descending)
  const models = Object.entries(distribution)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.cost - a.cost);

  return (
    <div>
      <h3 className="text-lg font-semibold text-text mb-4">Model Distribution</h3>
      <div className="bg-bg rounded-xl border border-border p-5 space-y-3">
        {models.map((model) => {
          const percentage = totalCost > 0 ? (model.cost / totalCost) * 100 : 0;

          return (
            <div key={model.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-text truncate">{model.name}</span>
                <span className="text-sm text-muted ml-2">
                  {formatCurrency(model.cost)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-panel rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * TokenBreakdown
 * --------------
 * Shows detailed token usage breakdown
 */
function TokenBreakdown({ totals }) {
  const breakdown = [
    {
      label: 'Input Tokens',
      value: totals.inputTokens,
      icon: Database,
      color: 'blue-500',
    },
    {
      label: 'Output Tokens',
      value: totals.outputTokens,
      icon: Cpu,
      color: 'green-500',
    },
    {
      label: 'Cache Creation',
      value: totals.cacheCreationTokens,
      icon: Zap,
      color: 'purple-500',
    },
    {
      label: 'Cache Read',
      value: totals.cacheReadTokens,
      icon: TrendingUp,
      color: 'orange-500',
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-text mb-4">Token Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {breakdown.map((item) => (
          <div key={item.label} className="bg-bg rounded-xl border border-border p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg bg-${item.color}/10 flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 text-${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted mb-0.5">{item.label}</div>
              <div className="text-xl font-bold text-text">{formatNumber(item.value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SyncInstructions
 * ----------------
 * Detailed instructions for syncing usage data
 */
function SyncInstructions({ onClose }) {
  return (
    <div className="mt-4 pt-4 border-t border-border text-left text-sm text-muted space-y-3 px-1">
      <p className="font-medium text-text">How to Sync Usage Data:</p>

      <div className="space-y-2 ml-2">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-text">1.</span>
          <p>Open your terminal in the myBrain project directory</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-semibold text-text">2.</span>
          <p>Run the Claude Code skill: <code className="px-2 py-0.5 bg-panel text-primary rounded text-xs">/claude-usage</code></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-semibold text-text">3.</span>
          <p>The skill will fetch usage data from ccusage and sync it to myBrain</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-semibold text-text">4.</span>
          <p>Refresh this page to see updated statistics</p>
        </div>
      </div>

      <div className="bg-panel rounded-lg p-3 mt-4">
        <p className="text-xs text-muted">
          <strong>Note:</strong> You'll need to provide your myBrain session token
          when prompted. The skill will guide you through the authentication process.
        </p>
      </div>
    </div>
  );
}

/**
 * SyncStatusCard
 * --------------
 * Warning card shown when usage data is stale (>1 hour old)
 */
function SyncStatusCard({ lastSync }) {
  const [copied, setCopied] = useState(false);

  if (!lastSync?.lastSyncAt) {
    return null; // No data yet - handled by empty state
  }

  const syncedAt = new Date(lastSync.lastSyncAt);
  const now = new Date();
  const hoursSinceSync = (now - syncedAt) / (1000 * 60 * 60);
  const isStale = hoursSinceSync > 1;

  if (!isStale) {
    return null; // Data is fresh, no need to show warning
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText('/claude-usage');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text mb-1">
            Usage data may be outdated
          </h3>
          <p className="text-sm text-muted mb-3">
            Last synced {formatDistanceToNow(syncedAt, { addSuffix: true })}.
            Run the sync command to fetch latest data:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-bg border border-border rounded text-sm font-mono text-primary">
              /claude-usage
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
