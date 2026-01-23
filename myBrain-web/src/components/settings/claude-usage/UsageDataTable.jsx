/**
 * =============================================================================
 * USAGEDATATABLE.JSX - Daily Usage Data Table (Hierarchical)
 * =============================================================================
 *
 * Displays a hierarchical view of daily Claude usage data:
 * - Date summary rows showing daily totals (bold)
 * - Model breakdown sub-rows beneath each date (indented with └)
 *
 * Columns: Date, Models, Input, Output, Cache Create, Cache Read, Total Tokens, Cost
 *
 * =============================================================================
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Table } from 'lucide-react';
import { useClaudeUsage } from '../../../hooks/useClaudeUsage';
import { formatCurrency } from '../../../lib/utils';
import Skeleton from '../../ui/Skeleton';

/**
 * Format number with commas (full display, not compact)
 * 1234567 -> "1,234,567"
 */
function formatNum(num) {
  if (num == null || num === 0) return '0';
  return num.toLocaleString();
}

/**
 * Shorten model name for display
 * "claude-opus-4-5-20251101" -> "opus-4-5"
 */
function shortModelName(model) {
  if (!model) return model;
  const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : model;
}

/**
 * Build flat rows array from records
 * Each date produces: 1 summary row + N model breakdown rows
 */
function buildRows(records) {
  const rows = [];

  for (const record of records) {
    const modelsUsed = record.modelsUsed || [];
    const modelBreakdowns = record.modelBreakdowns || [];

    // Date summary row
    rows.push({
      type: 'date',
      date: record.date,
      models: modelsUsed.map(shortModelName),
      input: record.inputTokens,
      output: record.outputTokens,
      cacheCreate: record.cacheCreationTokens,
      cacheRead: record.cacheReadTokens,
      total: record.totalTokens,
      cost: record.totalCost,
    });

    // Model breakdown rows
    for (const breakdown of modelBreakdowns) {
      rows.push({
        type: 'model',
        model: shortModelName(breakdown.modelName),
        input: breakdown.inputTokens,
        output: breakdown.outputTokens,
        cacheCreate: breakdown.cacheCreationTokens,
        cacheRead: breakdown.cacheReadTokens,
        total:
          (breakdown.inputTokens || 0) +
          (breakdown.outputTokens || 0) +
          (breakdown.cacheCreationTokens || 0) +
          (breakdown.cacheReadTokens || 0),
        cost: breakdown.cost,
      });
    }
  }

  return rows;
}

/**
 * UsageDataTable
 * --------------
 * Hierarchical table showing daily usage with per-model breakdowns
 */
export default function UsageDataTable() {
  const [days, setDays] = useState(7);
  const { data: stats, isLoading, error } = useClaudeUsage(days);

  const periods = [
    { value: 7, label: '7d' },
    { value: 14, label: '14d' },
    { value: 30, label: '30d' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted">
        Failed to load usage data
      </div>
    );
  }

  if (!stats?.records || stats.records.length === 0) {
    return null;
  }

  // Sort by date descending and build flat rows
  const sortedRecords = [...stats.records].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const rows = buildRows(sortedRecords);
  const { totals } = stats;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Table className="w-5 h-5 text-primary" />
          Daily Usage
        </h3>

        <div className="flex gap-1 bg-bg border border-border rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                days === p.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg rounded-xl border border-border overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-panel border-b border-border">
              <th className="px-3 py-2.5 text-left font-medium text-text border-r border-border">Date</th>
              <th className="px-3 py-2.5 text-left font-medium text-text border-r border-border">Models</th>
              <th className="px-3 py-2.5 text-right font-medium text-text border-r border-border">Input</th>
              <th className="px-3 py-2.5 text-right font-medium text-text border-r border-border">Output</th>
              <th className="px-3 py-2.5 text-right font-medium text-text border-r border-border">Cache Create</th>
              <th className="px-3 py-2.5 text-right font-medium text-text border-r border-border">Cache Read</th>
              <th className="px-3 py-2.5 text-right font-medium text-text border-r border-border">Total Tokens</th>
              <th className="px-3 py-2.5 text-right font-medium text-text">Cost (USD)</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) =>
              row.type === 'date' ? (
                <tr key={idx} className="bg-panel/30 border-b border-border font-medium">
                  <td className="px-3 py-2 text-text border-r border-border">{format(new Date(row.date), 'yyyy-MM-dd')}</td>
                  <td className="px-3 py-2 text-muted whitespace-pre-line leading-tight border-r border-border">
                    {row.models.map((m) => `- ${m}`).join('\n')}
                  </td>
                  <td className="px-3 py-2 text-right text-text tabular-nums border-r border-border">{formatNum(row.input)}</td>
                  <td className="px-3 py-2 text-right text-text tabular-nums border-r border-border">{formatNum(row.output)}</td>
                  <td className="px-3 py-2 text-right text-text tabular-nums border-r border-border">{formatNum(row.cacheCreate)}</td>
                  <td className="px-3 py-2 text-right text-text tabular-nums border-r border-border">{formatNum(row.cacheRead)}</td>
                  <td className="px-3 py-2 text-right text-text tabular-nums border-r border-border">{formatNum(row.total)}</td>
                  <td className="px-3 py-2 text-right text-primary tabular-nums">{formatCurrency(row.cost)}</td>
                </tr>
              ) : (
                <tr key={idx} className="border-b border-border hover:bg-panel/20">
                  <td className="px-3 py-1.5 text-muted border-r border-border font-mono">└</td>
                  <td className="px-3 py-1.5 text-text/70 border-r border-border">{row.model}</td>
                  <td className="px-3 py-1.5 text-right text-text/70 tabular-nums border-r border-border">{formatNum(row.input)}</td>
                  <td className="px-3 py-1.5 text-right text-text/70 tabular-nums border-r border-border">{formatNum(row.output)}</td>
                  <td className="px-3 py-1.5 text-right text-text/70 tabular-nums border-r border-border">{formatNum(row.cacheCreate)}</td>
                  <td className="px-3 py-1.5 text-right text-text/70 tabular-nums border-r border-border">{formatNum(row.cacheRead)}</td>
                  <td className="px-3 py-1.5 text-right text-text/70 tabular-nums border-r border-border">{formatNum(row.total)}</td>
                  <td className="px-3 py-1.5 text-right text-primary/70 tabular-nums">{formatCurrency(row.cost)}</td>
                </tr>
              )
            )}
          </tbody>

          <tfoot>
            <tr className="bg-panel border-t-2 border-border font-semibold">
              <td className="px-3 py-2.5 text-text border-r border-border">Total</td>
              <td className="px-3 py-2.5 border-r border-border"></td>
              <td className="px-3 py-2.5 text-right text-text tabular-nums border-r border-border">{formatNum(totals.inputTokens)}</td>
              <td className="px-3 py-2.5 text-right text-text tabular-nums border-r border-border">{formatNum(totals.outputTokens)}</td>
              <td className="px-3 py-2.5 text-right text-text tabular-nums border-r border-border">{formatNum(totals.cacheCreationTokens)}</td>
              <td className="px-3 py-2.5 text-right text-text tabular-nums border-r border-border">{formatNum(totals.cacheReadTokens)}</td>
              <td className="px-3 py-2.5 text-right text-text tabular-nums border-r border-border">{formatNum(totals.totalTokens)}</td>
              <td className="px-3 py-2.5 text-right text-primary font-bold tabular-nums">{formatCurrency(totals.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
