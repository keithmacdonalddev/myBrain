/**
 * =============================================================================
 * COSTTRENDCHART.JSX - Cost and Token Trend Charts
 * =============================================================================
 *
 * Visual charts showing Claude usage over time using Recharts library.
 * Shows daily cost trend (line chart) and daily token usage (area chart).
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, DollarSign, Cpu, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useClaudeUsage } from '../../../hooks/useClaudeUsage';
import { formatCurrency, formatNumber } from '../../../lib/utils';
import Skeleton from '../../ui/Skeleton';

/**
 * CostTrendChart
 * --------------
 * Main component showing cost and token trends over time
 */
export default function CostTrendChart() {
  const [chartType, setChartType] = useState('cost'); // 'cost' or 'tokens'
  const [period, setPeriod] = useState(1); // Default to Today

  const { data: stats, isLoading, error } = useClaudeUsage(period);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-bg rounded-xl border border-border">
        <AlertCircle className="w-10 h-10 text-danger mb-2" />
        <p className="text-sm text-danger">{error.message}</p>
      </div>
    );
  }

  // No data state
  if (!stats?.dailyUsage || stats.dailyUsage.length === 0) {
    return (
      <div className="text-center py-12 bg-bg rounded-xl border border-border">
        <TrendingUp className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-text mb-2">No Trend Data</h3>
        <p className="text-sm text-muted">
          Sync more usage data to see trends over time
        </p>
      </div>
    );
  }

  // Transform daily usage data for charts
  const chartData = stats.dailyUsage
    .map((day) => ({
      date: day.date,
      cost: day.totalCost || 0,
      tokens: day.totalTokens || 0,
      inputTokens: day.inputTokens || 0,
      outputTokens: day.outputTokens || 0,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate average for reference line
  const avgCost = chartData.reduce((sum, d) => sum + d.cost, 0) / chartData.length;
  const avgTokens = chartData.reduce((sum, d) => sum + d.tokens, 0) / chartData.length;

  // Find peak day
  const peakCostDay = chartData.reduce((max, d) => d.cost > max.cost ? d : max, chartData[0]);
  const peakTokenDay = chartData.reduce((max, d) => d.tokens > max.tokens ? d : max, chartData[0]);

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Usage Trends
        </h3>

        <div className="flex items-center gap-3">
          {/* Chart type toggle */}
          <div className="flex bg-bg rounded-lg border border-border p-1">
            <button
              onClick={() => setChartType('cost')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                chartType === 'cost'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Cost
            </button>
            <button
              onClick={() => setChartType('tokens')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                chartType === 'tokens'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Tokens
            </button>
          </div>

          {/* Period selector */}
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
      </div>

      {/* Chart */}
      <div className="bg-bg rounded-xl border border-border p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'cost' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<CostTooltip />} />
                <ReferenceLine
                  y={avgCost}
                  stroke="var(--color-muted)"
                  strokeDasharray="5 5"
                  label={{ value: `Avg: ${formatCurrency(avgCost)}`, position: 'right', fontSize: 10, fill: 'var(--color-muted)' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--color-primary)' }}
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatNumber(value)}
                  stroke="var(--color-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<TokenTooltip />} />
                <ReferenceLine
                  y={avgTokens}
                  stroke="var(--color-muted)"
                  strokeDasharray="5 5"
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak usage stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg rounded-xl border border-border p-4">
          <div className="text-sm text-muted mb-1">Peak Cost Day</div>
          <div className="text-lg font-bold text-text">
            {formatCurrency(peakCostDay.cost)}
          </div>
          <div className="text-xs text-muted">
            {format(parseISO(peakCostDay.date), 'EEEE, MMM d')}
          </div>
        </div>
        <div className="bg-bg rounded-xl border border-border p-4">
          <div className="text-sm text-muted mb-1">Peak Token Day</div>
          <div className="text-lg font-bold text-text">
            {formatNumber(peakTokenDay.tokens)}
          </div>
          <div className="text-xs text-muted">
            {format(parseISO(peakTokenDay.date), 'EEEE, MMM d')}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom tooltip for cost chart
 */
function CostTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-panel border border-border rounded-lg shadow-lg p-3">
      <div className="text-sm font-medium text-text mb-1">
        {format(parseISO(label), 'EEEE, MMM d, yyyy')}
      </div>
      <div className="text-lg font-bold text-primary">
        {formatCurrency(payload[0].value)}
      </div>
    </div>
  );
}

/**
 * Custom tooltip for token chart
 */
function TokenTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-panel border border-border rounded-lg shadow-lg p-3">
      <div className="text-sm font-medium text-text mb-2">
        {format(parseISO(label), 'EEEE, MMM d, yyyy')}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Total:</span>
          <span className="font-medium text-text">{formatNumber(data.tokens)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Input:</span>
          <span className="text-text">{formatNumber(data.inputTokens)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Output:</span>
          <span className="text-text">{formatNumber(data.outputTokens)}</span>
        </div>
      </div>
    </div>
  );
}
