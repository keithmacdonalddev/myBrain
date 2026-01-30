/**
 * ActivityExport Component
 *
 * Date range picker and format selector for exporting activity data.
 * Downloads data as CSV or JSON file using blob URL.
 */
import { useState } from 'react';
import { Download, FileText, FileJson, Calendar, Loader2 } from 'lucide-react';
import { activityApi } from '../../../lib/api';
import useToast from '../../../hooks/useToast';
import { toInputDateValue } from '../../../lib/dateUtils';

/**
 * Activity export form with date range and format options
 */
export default function ActivityExport() {
  const toast = useToast();

  // Form state
  const [format, setFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Date range state (default: last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(toInputDateValue(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(toInputDateValue(today));

  // Handle export
  const handleExport = async () => {
    // Validate dates
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      toast.error('Start date must be before end date');
      return;
    }

    setIsExporting(true);

    try {
      // Fetch export data as blob
      const response = await activityApi.exportActivity({
        format,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      });

      // Create blob from response
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-export-${Date.now()}.${format}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export downloaded successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error.message || 'Failed to export activity data');
    } finally {
      setIsExporting(false);
    }
  };

  // Preset date ranges
  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(toInputDateValue(start));
    setEndDate(toInputDateValue(end));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text">Export Activity Data</h2>
        <p className="text-sm text-muted mt-1">
          Download your activity history in CSV or JSON format
        </p>
      </div>

      {/* Export form */}
      <div className="bg-panel border border-border rounded-lg p-6 space-y-6">
        {/* Date range section */}
        <div>
          <h3 className="text-sm font-medium text-text mb-3">Date Range</h3>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map((preset) => (
              <button
                key={preset.days}
                onClick={() => applyPreset(preset.days)}
                className="px-3 py-1.5 text-sm text-muted border border-border rounded-lg hover:border-[var(--primary)]/50 hover:text-text transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={toInputDateValue(today)}
                  className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Format selection */}
        <div>
          <h3 className="text-sm font-medium text-text mb-3">Export Format</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* CSV option */}
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                format === 'csv'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-border hover:border-[var(--primary)]/50'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  format === 'csv' ? 'bg-[var(--primary)]/15' : 'bg-bg'
                }`}
              >
                <FileText
                  className={`w-5 h-5 ${
                    format === 'csv' ? 'text-[var(--primary)]' : 'text-muted'
                  }`}
                />
              </div>
              <div className="text-left">
                <p
                  className={`font-medium ${
                    format === 'csv' ? 'text-[var(--primary)]' : 'text-text'
                  }`}
                >
                  CSV
                </p>
                <p className="text-xs text-muted">For spreadsheets</p>
              </div>
            </button>

            {/* JSON option */}
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                format === 'json'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-border hover:border-[var(--primary)]/50'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  format === 'json' ? 'bg-[var(--primary)]/15' : 'bg-bg'
                }`}
              >
                <FileJson
                  className={`w-5 h-5 ${
                    format === 'json' ? 'text-[var(--primary)]' : 'text-muted'
                  }`}
                />
              </div>
              <div className="text-left">
                <p
                  className={`font-medium ${
                    format === 'json' ? 'text-[var(--primary)]' : 'text-text'
                  }`}
                >
                  JSON
                </p>
                <p className="text-xs text-muted">For developers</p>
              </div>
            </button>
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download Export
            </>
          )}
        </button>
      </div>

      {/* Info note */}
      <div className="p-4 bg-bg rounded-lg border border-border">
        <p className="text-sm text-muted">
          Your export will include all activity types: logins, content changes, and
          settings updates. Personal data will be included - keep your export secure.
        </p>
      </div>
    </div>
  );
}
