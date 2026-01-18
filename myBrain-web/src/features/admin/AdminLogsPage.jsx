import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  X
} from 'lucide-react';
import { adminApi } from '../../lib/api';

function LogRow({ log, onClick }) {
  const getStatusColor = (status) => {
    if (status >= 500) return 'text-red-500 bg-red-500/10';
    if (status >= 400) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div
      onClick={() => onClick(log)}
      className="flex items-center gap-4 p-3 hover:bg-bg rounded-lg cursor-pointer transition-colors border-b border-border last:border-0"
    >
      <div className={`px-2 py-1 rounded text-xs font-mono ${getStatusColor(log.statusCode)}`}>
        {log.statusCode}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">{log.method}</span>
          <span className="text-sm text-text truncate">{log.route}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted">{formatDate(log.timestamp)}</span>
          <span className="text-xs text-muted">{log.durationMs}ms</span>
          {log.userEmail && (
            <span className="text-xs text-muted truncate">{log.userEmail}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted" />
    </div>
  );
}

function LogDetailDrawer({ log, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const copyRequestId = () => {
    navigator.clipboard.writeText(log.requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = () => {
    if (log.statusCode >= 500) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (log.statusCode >= 400) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel border-l border-border overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-panel border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="font-semibold text-text">{log.eventName}</h2>
              <p className="text-xs text-muted">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg rounded-lg">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Request ID */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Request ID</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-bg rounded text-sm font-mono text-text">
                {log.requestId}
              </code>
              <button
                onClick={copyRequestId}
                className="p-2 hover:bg-bg rounded-lg transition-colors"
                title="Copy"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted" />
                )}
              </button>
            </div>
          </div>

          {/* Request Info */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Request</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted">Method</div>
              <div className="text-text font-mono">{log.method}</div>
              <div className="text-muted">Route</div>
              <div className="text-text font-mono truncate">{log.route}</div>
              <div className="text-muted">Status</div>
              <div className="text-text font-mono">{log.statusCode}</div>
              <div className="text-muted">Duration</div>
              <div className="text-text font-mono">{log.durationMs}ms</div>
            </div>
          </div>

          {/* User Info */}
          {log.userId && (
            <div>
              <h3 className="text-sm font-medium text-muted mb-2">User</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted">Email</div>
                <div className="text-text">{log.userEmail || '-'}</div>
                <div className="text-muted">Role</div>
                <div className="text-text">{log.userRole || '-'}</div>
                <div className="text-muted">User ID</div>
                <div className="text-text font-mono text-xs truncate">{log.userId}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {log.error?.code && (
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-2">Error</h3>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 rounded text-red-500 font-mono">
                    {log.error.code}
                  </span>
                  <span className="text-xs text-red-400">{log.error.category}</span>
                </div>
                <p className="text-sm text-red-400">{log.error.messageSafe}</p>
              </div>
            </div>
          )}

          {/* Client Info */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Client</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted">IP</div>
              <div className="text-text font-mono">{log.clientInfo?.ip || '-'}</div>
              <div className="text-muted">Origin</div>
              <div className="text-text truncate">{log.clientInfo?.origin || '-'}</div>
            </div>
            {log.clientInfo?.userAgent && (
              <div className="mt-2">
                <div className="text-muted text-sm mb-1">User Agent</div>
                <div className="text-xs text-text bg-bg p-2 rounded font-mono break-all">
                  {log.clientInfo.userAgent}
                </div>
              </div>
            )}
          </div>

          {/* Sampling Info */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Sampling</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted">Sampled</div>
              <div className="text-text">{log.sampled ? 'Yes' : 'No'}</div>
              <div className="text-muted">Reason</div>
              <div className="text-text">{log.sampleReason || '-'}</div>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="group">
            <summary className="text-sm font-medium text-muted cursor-pointer hover:text-text">
              Raw JSON
            </summary>
            <pre className="mt-2 p-3 bg-bg rounded text-xs font-mono text-text overflow-auto max-h-64">
              {JSON.stringify(log, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function AdminLogsPage() {
  const [filters, setFilters] = useState({
    requestId: '',
    statusCode: '',
    hasError: '',
    limit: 50
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Calculate skip from page
  const skip = (page - 1) * filters.limit;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-logs', filters, page],
    queryFn: async () => {
      const params = { ...filters, skip };
      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const response = await adminApi.getLogs(params);
      return response.data;
    }
  });

  // Calculate pagination info
  const totalPages = data?.total ? Math.ceil(data.total / filters.limit) : 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const { data: stats } = useQuery({
    queryKey: ['admin-logs-stats'],
    queryFn: async () => {
      const response = await adminApi.getLogStats();
      return response.data;
    }
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text">Request Logs</h1>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-bg rounded-lg">
              <div className="text-2xl font-semibold text-text">{stats.summary.totalRequests}</div>
              <div className="text-xs text-muted">Total Requests</div>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <div className="text-2xl font-semibold text-text">{Math.round(stats.summary.avgDuration)}ms</div>
              <div className="text-xs text-muted">Avg Duration</div>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <div className="text-2xl font-semibold text-yellow-500">{stats.summary.errorCount}</div>
              <div className="text-xs text-muted">Client Errors</div>
            </div>
            <div className="p-3 bg-bg rounded-lg">
              <div className="text-2xl font-semibold text-red-500">{stats.summary.serverErrorCount}</div>
              <div className="text-xs text-muted">Server Errors</div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={filters.requestId}
              onChange={(e) => handleFilterChange('requestId', e.target.value)}
              placeholder="Search by request ID..."
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-lg transition-colors ${
              showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-bg text-muted'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-bg rounded-lg border border-border grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted block mb-1">Status Code</label>
              <select
                value={filters.statusCode}
                onChange={(e) => handleFilterChange('statusCode', e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
              >
                <option value="">All</option>
                <option value="200">200</option>
                <option value="400">400</option>
                <option value="401">401</option>
                <option value="404">404</option>
                <option value="500">500</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Has Error</label>
              <select
                value={filters.hasError}
                onChange={(e) => handleFilterChange('hasError', e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
              >
                <option value="">All</option>
                <option value="true">Errors only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Limit</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Logs list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-bg rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">Failed to load logs</p>
            <p className="text-sm text-muted mt-1">{error.message}</p>
          </div>
        ) : data?.logs?.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-muted">No logs found</p>
          </div>
        ) : (
          <div className="p-4">
            {data?.logs?.map((log) => (
              <LogRow
                key={log._id}
                log={log}
                onClick={setSelectedLog}
              />
            ))}

            {/* Pagination */}
            {data?.total > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted">
                  Showing {skip + 1}-{Math.min(skip + filters.limit, data.total)} of {data.total} logs
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={!hasPrevPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4 text-muted" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted" />
                  </button>
                  <span className="px-3 py-1 text-sm text-text">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={!hasNextPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4 text-muted" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log detail drawer */}
      {selectedLog && (
        <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

export default AdminLogsPage;
