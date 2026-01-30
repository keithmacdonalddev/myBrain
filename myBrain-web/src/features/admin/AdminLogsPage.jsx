import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  X,
  Shield,
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Ban,
  Plus
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import AdminNav from './components/AdminNav';
import {
  useRateLimitEvents,
  useRateLimitStats,
  useResolveRateLimitEvent,
  useResolveRateLimitEventsByIP,
  useAddToWhitelist
} from './hooks/useAdminUsers';

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

// Rate Limit Events Tab Component
function RateLimitEventsTab() {
  const [filters, setFilters] = useState({
    resolved: '',
    ip: '',
    limit: 50
  });
  const [searchIP, setSearchIP] = useState(''); // Local state for debounced IP search
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingEventId, setLoadingEventId] = useState(null); // Per-item loading state

  // Refs for timeout cleanup
  const successTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Helper to show success message with auto-dismiss
  const showSuccess = useCallback((message) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(message);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  // Helper to show error message with auto-dismiss
  const showError = useCallback((message) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(''), 5000);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Debounce IP search input
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (searchIP !== filters.ip) {
        setFilters(prev => ({ ...prev, ip: searchIP }));
        setPage(1);
      }
    }, 300);
  }, [searchIP, filters.ip]);

  const skip = (page - 1) * filters.limit;

  const { data, isLoading, error } = useRateLimitEvents({
    ...filters,
    skip,
    limit: filters.limit
  });

  const { data: statsData } = useRateLimitStats(3600000); // 1 hour window

  const resolveEvent = useResolveRateLimitEvent();
  const resolveByIP = useResolveRateLimitEventsByIP();
  const addToWhitelist = useAddToWhitelist();

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / filters.limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResolve = async (eventId, action) => {
    setLoadingEventId(eventId);
    try {
      await resolveEvent.mutateAsync({ id: eventId, action });
      showSuccess(`Event ${action === 'dismissed' ? 'dismissed' : 'resolved'}`);
    } catch (e) {
      showError(e.response?.data?.error || `Failed to ${action === 'dismissed' ? 'dismiss' : 'resolve'} event`);
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleResolveAllByIP = async (ip, action) => {
    try {
      await resolveByIP.mutateAsync({ ip, action });
      showSuccess(`All events from ${ip} ${action === 'whitelisted' ? 'whitelisted' : 'resolved'}`);
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to resolve events');
    }
  };

  const handleWhitelist = async (eventId, ip) => {
    setLoadingEventId(eventId);
    try {
      await addToWhitelist.mutateAsync({ ip, resolveEvents: true });
      showSuccess(`${ip} added to whitelist`);
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to add IP to whitelist');
    } finally {
      setLoadingEventId(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm" role="status">
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-bg rounded-lg">
            <div className="text-2xl font-semibold text-text">{statsData.stats?.totalEvents || 0}</div>
            <div className="text-xs text-muted">Total Events (1h)</div>
          </div>
          <div className="p-3 bg-bg rounded-lg">
            <div className="text-2xl font-semibold text-yellow-500">{statsData.stats?.unresolvedCount || 0}</div>
            <div className="text-xs text-muted">Unresolved</div>
          </div>
          <div className="p-3 bg-bg rounded-lg">
            <div className="text-2xl font-semibold text-text">{statsData.stats?.uniqueIPs || 0}</div>
            <div className="text-xs text-muted">Unique IPs</div>
          </div>
          <div className="p-3 bg-bg rounded-lg">
            <div className="text-2xl font-semibold text-red-500">{statsData.stats?.topOffenders?.length || 0}</div>
            <div className="text-xs text-muted">Top Offenders</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <label htmlFor="rate-limit-ip-search" className="sr-only">Search by IP address</label>
          <input
            id="rate-limit-ip-search"
            type="text"
            value={searchIP}
            onChange={(e) => setSearchIP(e.target.value)}
            placeholder="Search by IP address..."
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          aria-expanded={showFilters}
          aria-controls="rate-limit-filter-panel"
          className={`p-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-bg text-muted'
          }`}
        >
          <Filter className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div id="rate-limit-filter-panel" role="region" aria-label="Event filters" className="p-3 bg-bg rounded-lg border border-border grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">Status</label>
            <select
              value={filters.resolved}
              onChange={(e) => handleFilterChange('resolved', e.target.value)}
              className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
            >
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      )}

      {/* Events list */}
      {isLoading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-bg rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">Failed to load rate limit events</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center">
          <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-muted">No rate limit events found</p>
          <p className="text-xs text-muted mt-1">All clear - no suspicious activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event._id}
              className={`p-4 rounded-lg border ${
                event.resolved
                  ? 'bg-bg border-border'
                  : 'bg-red-500/5 border-red-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {event.resolved ? (
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm font-mono text-text">{event.ip}</span>
                    {event.resolved && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                        {event.action || 'Resolved'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted space-y-0.5">
                    <p>Route: {event.route}</p>
                    {event.attemptedEmail && (
                      <p>Email: {event.attemptedEmail}</p>
                    )}
                    <p>{formatDate(event.timestamp)}</p>
                  </div>
                </div>

                {/* Actions */}
                {!event.resolved && (
                  <div role="group" aria-label={`Actions for rate limit event from ${event.ip}`} className="flex items-center gap-1">
                    <button
                      onClick={() => handleWhitelist(event._id, event.ip)}
                      disabled={loadingEventId === event._id}
                      aria-label={`Whitelist IP address ${event.ip}`}
                      aria-busy={loadingEventId === event._id}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    >
                      {loadingEventId === event._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Plus className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>Whitelist</span>
                    </button>
                    <button
                      onClick={() => handleResolve(event._id, 'dismissed')}
                      disabled={loadingEventId === event._id}
                      aria-label={`Dismiss rate limit event from ${event.ip}`}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {loadingEventId === event._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>Dismiss</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > 0 && (
            <nav aria-label="Rate limit events pagination" className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted">
                Showing {skip + 1}-{Math.min(skip + filters.limit, total)} of {total} events
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={!hasPrevPage}
                  aria-label="Go to first page"
                  aria-disabled={!hasPrevPage}
                  className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <ChevronsLeft className="w-4 h-4 text-muted" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                  aria-label="Go to previous page"
                  aria-disabled={!hasPrevPage}
                  className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <ChevronLeft className="w-4 h-4 text-muted" aria-hidden="true" />
                </button>
                <span className="px-3 py-1 text-sm text-text" aria-live="polite">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={!hasNextPage}
                  aria-label="Go to next page"
                  aria-disabled={!hasNextPage}
                  className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <ChevronRight className="w-4 h-4 text-muted" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNextPage}
                  aria-label="Go to last page"
                  aria-disabled={!hasNextPage}
                  className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <ChevronsRight className="w-4 h-4 text-muted" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

function AdminLogsPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'rateLimit'
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
    <div className="px-6 py-8">
      <AdminNav />

      {/* Logs Content */}
      <div className="flex flex-col">
        {/* Tabs Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-1 bg-bg rounded-lg p-1">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'requests'
                  ? 'bg-panel text-text'
                  : 'text-muted hover:text-text'
              }`}
            >
              Request Logs
            </button>
            <button
              onClick={() => setActiveTab('rateLimit')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'rateLimit'
                  ? 'bg-panel text-text'
                  : 'text-muted hover:text-text'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Rate Limit Events
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'rateLimit' ? (
          <RateLimitEventsTab />
        ) : (
          <>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
            <label htmlFor="request-log-search" className="sr-only">Search by request ID</label>
            <input
              id="request-log-search"
              type="text"
              value={filters.requestId}
              onChange={(e) => handleFilterChange('requestId', e.target.value)}
              placeholder="Search by request ID..."
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label={showFilters ? 'Hide filters' : 'Show filters'}
            aria-expanded={showFilters}
            aria-controls="request-log-filter-panel"
            className={`p-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-bg text-muted'
            }`}
          >
            <Filter className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div id="request-log-filter-panel" role="region" aria-label="Log filters" className="mt-3 p-3 bg-bg rounded-lg border border-border grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="filter-status-code" className="text-xs text-muted block mb-1">Status Code</label>
              <select
                id="filter-status-code"
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
              <label htmlFor="filter-has-error" className="text-xs text-muted block mb-1">Has Error</label>
              <select
                id="filter-has-error"
                value={filters.hasError}
                onChange={(e) => handleFilterChange('hasError', e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded text-sm text-text"
              >
                <option value="">All</option>
                <option value="true">Errors only</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-limit" className="text-xs text-muted block mb-1">Limit</label>
              <select
                id="filter-limit"
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

        {/* Logs list */}
        <div className="mt-4">
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
              <nav aria-label="Request logs pagination" className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted">
                  Showing {skip + 1}-{Math.min(skip + filters.limit, data.total)} of {data.total} logs
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={!hasPrevPage}
                    aria-label="Go to first page"
                    aria-disabled={!hasPrevPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <ChevronsLeft className="w-4 h-4 text-muted" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrevPage}
                    aria-label="Go to previous page"
                    aria-disabled={!hasPrevPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted" aria-hidden="true" />
                  </button>
                  <span className="px-3 py-1 text-sm text-text" aria-live="polite">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={!hasNextPage}
                    aria-label="Go to next page"
                    aria-disabled={!hasNextPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <ChevronRight className="w-4 h-4 text-muted" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={!hasNextPage}
                    aria-label="Go to last page"
                    aria-disabled={!hasNextPage}
                    className="p-2 rounded-lg hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <ChevronsRight className="w-4 h-4 text-muted" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
        </div>
          </>
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
