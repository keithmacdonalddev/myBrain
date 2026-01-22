/**
 * =============================================================================
 * MODELUSAGETRENDS.JSX - Model Usage Patterns Component
 * =============================================================================
 *
 * Shows which Claude models are being used and how usage is distributed.
 * Displays cost breakdown by model with percentages and trend indicators.
 *
 * =============================================================================
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Cpu, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useClaudeUsage } from '../../../hooks/useClaudeUsage';
import { formatCurrency, formatNumber } from '../../../lib/utils';
import Skeleton from '../../ui/Skeleton';

// Color palette for pie chart segments
const COLORS = [
  '#8b5cf6', // Purple (primary)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

/**
 * ModelUsageTrends
 * ----------------
 * Shows model distribution and usage patterns
 */
export default function ModelUsageTrends() {
  const [period, setPeriod] = useState(1); // Default to Today

  const { data: currentStats, isLoading: loadingCurrent, error: currentError } = useClaudeUsage(period);
  const { data: previousStats, isLoading: loadingPrevious } = useClaudeUsage(period * 2);

  const isLoading = loadingCurrent || loadingPrevious;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (currentError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-bg rounded-xl border border-border">
        <AlertCircle className="w-10 h-10 text-danger mb-2" />
        <p className="text-sm text-danger">{currentError.message}</p>
      </div>
    );
  }

  // No data state
  const modelDistribution = currentStats?.modelDistribution;
  if (!modelDistribution || Object.keys(modelDistribution).length === 0) {
    return (
      <div className="text-center py-12 bg-bg rounded-xl border border-border">
        <Cpu className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-text mb-2">No Model Data</h3>
        <p className="text-sm text-muted">
          Sync more usage data to see model patterns
        </p>
      </div>
    );
  }

  // Transform model data for chart
  const totalCost = currentStats.totals.totalCost;
  const chartData = Object.entries(modelDistribution)
    .map(([name, data]) => ({
      name,
      cost: data.cost,
      tokens: data.tokens,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Calculate trends by comparing with previous period
  const previousModelDistribution = previousStats?.modelDistribution || {};
  const modelTrends = calculateModelTrends(modelDistribution, previousModelDistribution, period);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          Model Usage Patterns
        </h3>

        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value={1}>Today</option>
          <option value={7}>7 Days</option>
          <option value={30}>30 Days</option>
          <option value={90}>90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="bg-bg rounded-xl border border-border p-4">
          <h4 className="text-sm font-medium text-text mb-4">Cost Distribution</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="cost"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ModelTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {chartData.map((model, index) => (
              <div key={model.name} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-muted truncate max-w-[100px]" title={model.name}>
                  {model.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Model List with Trends */}
        <div className="bg-bg rounded-xl border border-border p-4">
          <h4 className="text-sm font-medium text-text mb-4">Model Breakdown</h4>
          <div className="space-y-3">
            {chartData.map((model, index) => {
              const trend = modelTrends[model.name];
              return (
                <ModelRow
                  key={model.name}
                  model={model}
                  color={COLORS[index % COLORS.length]}
                  trend={trend}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="bg-bg rounded-xl border border-border p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-text">
              {chartData.length}
            </div>
            <div className="text-sm text-muted">Models Used</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text">
              {chartData[0]?.name || 'N/A'}
            </div>
            <div className="text-sm text-muted">Most Used</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text">
              {chartData[0]?.percentage.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-muted">Top Model Share</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ModelRow
 * --------
 * Individual model in the breakdown list
 */
function ModelRow({ model, color, trend }) {
  return (
    <div className="flex items-center gap-3">
      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Model info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-text truncate" title={model.name}>
            {model.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">
              {formatCurrency(model.cost)}
            </span>
            {trend && <TrendIndicator trend={trend} />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-panel rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${model.percentage}%`,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-1 text-xs text-muted">
          <span>{model.percentage.toFixed(1)}% of total</span>
          <span>{formatNumber(model.tokens)} tokens</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TrendIndicator
 * --------------
 * Shows if model usage is increasing/decreasing
 */
function TrendIndicator({ trend }) {
  if (trend > 5) {
    return (
      <span className="flex items-center text-green-500" title={`+${trend.toFixed(0)}% vs previous period`}>
        <TrendingUp className="w-3 h-3" />
      </span>
    );
  }
  if (trend < -5) {
    return (
      <span className="flex items-center text-red-500" title={`${trend.toFixed(0)}% vs previous period`}>
        <TrendingDown className="w-3 h-3" />
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted" title="Stable">
      <Minus className="w-3 h-3" />
    </span>
  );
}

/**
 * Custom tooltip for pie chart
 */
function ModelTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-panel border border-border rounded-lg shadow-lg p-3">
      <div className="text-sm font-medium text-text mb-2">{data.name}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Cost:</span>
          <span className="font-medium text-text">{formatCurrency(data.cost)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Tokens:</span>
          <span className="text-text">{formatNumber(data.tokens)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Share:</span>
          <span className="text-text">{data.percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate trend percentages for each model
 */
function calculateModelTrends(current, previous, period) {
  const trends = {};

  // For each model in current period, calculate change vs previous
  Object.entries(current).forEach(([model, data]) => {
    const previousData = previous[model];
    if (previousData && previousData.cost > 0) {
      // Calculate percentage change
      const change = ((data.cost - previousData.cost) / previousData.cost) * 100;
      trends[model] = change;
    } else if (!previousData) {
      // New model, show as increasing
      trends[model] = 100;
    } else {
      trends[model] = 0;
    }
  });

  return trends;
}
