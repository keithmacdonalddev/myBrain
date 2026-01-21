import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  HardDrive,
  Server,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  Users,
  FolderOpen,
  Image,
  Calendar,
  CheckSquare,
  Briefcase,
  Tag,
  LayoutGrid,
  ScrollText,
  Zap,
  HelpCircle,
  Info
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import AdminNav from './components/AdminNav';
import Tooltip from '../../components/ui/Tooltip';

// Tooltip descriptions for metrics
const TOOLTIPS = {
  // Overview stats
  databaseSize: "Total size of the database including data and indexes. This represents the actual disk space used by MongoDB.",
  dataSize: "Size of all documents (data) in the database, excluding indexes. This is the uncompressed size of your actual data.",
  indexSize: "Total size of all indexes across all collections. Indexes speed up queries but consume memory and storage.",
  avgObjSize: "Average size of a single document across all collections. Larger documents may impact query performance.",
  connection: "Current connection status to MongoDB. 'Connected' means the app can communicate with the database.",
  totalObjects: "Total number of documents (records) stored across all collections in the database.",

  // Health
  healthy: "Database health is determined by connection status, ping latency (<1000ms), and read capability.",
  pingLatency: "Time in milliseconds for a round-trip communication with the database. Lower is better. >100ms may indicate network issues.",

  // Collections
  collectionCount: "Number of documents (records) in this collection.",
  collectionSize: "Total size of all documents in this collection (uncompressed).",
  storageSize: "Actual disk space used by this collection, including pre-allocated space and compression.",
  avgDocSize: "Average size of documents in this collection. Helps identify collections with large documents.",
  totalIndexSize: "Combined size of all indexes for this collection. More indexes = faster reads but slower writes.",
  indexCount: "Number of indexes on this collection. Each index speeds up specific queries but adds overhead.",

  // Document counts
  users: "Total registered user accounts in the system.",
  notes: "Total notes created by all users.",
  tasks: "Total tasks (to-dos) created by all users.",
  projects: "Total projects created by all users.",
  events: "Total calendar events created by all users.",
  images: "Total images uploaded to the image library.",
  files: "Total files uploaded to the file manager.",
  folders: "Total folders created in the file manager.",
  logs: "Total API request logs stored (used for analytics and debugging).",
  lifeAreas: "Total life area categories created by users.",
  tags: "Total unique tags created by users.",

  // Growth
  last7Days: "Number of new items created in the last 7 days.",
  last30Days: "Number of new items created in the last 30 days.",
  avgPerDay: "Average number of new items created per day over the last 30 days.",

  // Slow queries
  slowQueries: "API requests that took longer than 500ms to complete. Slow queries may indicate performance issues or heavy database operations.",
  avgDuration: "Average response time for this endpoint. Lower is better.",
  minDuration: "Fastest recorded response time for this endpoint.",
  maxDuration: "Slowest recorded response time for this endpoint.",
  occurrences: "Number of times this slow query occurred in the selected time period.",

  // Response time distribution
  responseDistribution: "Distribution of all API response times. Most requests should fall in the 0-100ms range for good performance.",

  // Server info
  mongoVersion: "Version of MongoDB server. Keep updated for security patches and new features.",
  uptime: "How long the MongoDB server has been running since last restart.",
  currentConnections: "Number of active connections to MongoDB. High numbers may indicate connection leaks.",
  availableConnections: "Number of connections available in the pool. If low, the app may struggle under load.",

  // Operation counters
  insert: "Total INSERT operations since server start. Creating new documents.",
  query: "Total QUERY operations since server start. Reading/finding documents.",
  update: "Total UPDATE operations since server start. Modifying existing documents.",
  delete: "Total DELETE operations since server start. Removing documents.",
  getmore: "Total GETMORE operations since server start. Fetching more results from cursors.",
  command: "Total COMMAND operations since server start. Database commands like aggregations.",
};

// Format bytes to human readable
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return 'N/A';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format number with commas
function formatNumber(num) {
  if (num === undefined || num === null) return 'N/A';
  return num.toLocaleString();
}

// Info icon for tooltips
function InfoIcon({ tooltip, position = 'top' }) {
  return (
    <Tooltip content={tooltip} position={position}>
      <HelpCircle className="w-3.5 h-3.5 text-muted hover:text-text cursor-help inline-block ml-1" />
    </Tooltip>
  );
}

// Stat card component with tooltip
function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', tooltip }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">
            {title}
            {tooltip && <InfoIcon tooltip={tooltip} />}
          </p>
          <p className="text-2xl font-bold text-text mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
      </div>
    </div>
  );
}

// Health status badge with tooltip
function HealthBadge({ healthy, latency }) {
  return (
    <Tooltip content={TOOLTIPS.healthy} position="bottom">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-help ${
        healthy
          ? 'bg-green-500/10 text-green-500'
          : 'bg-red-500/10 text-red-500'
      }`}>
        {healthy ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        <span>{healthy ? 'Healthy' : 'Unhealthy'}</span>
        {latency && (
          <Tooltip content={TOOLTIPS.pingLatency} position="bottom">
            <span className="text-muted cursor-help">({latency}ms)</span>
          </Tooltip>
        )}
      </div>
    </Tooltip>
  );
}

// Collection row component with tooltips
function CollectionRow({ collection, isExpanded, onToggle }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted" />
          )}
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text">{collection.name}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <Tooltip content={TOOLTIPS.collectionCount} position="top">
            <span className="cursor-help">{formatNumber(collection.count)} docs</span>
          </Tooltip>
          <Tooltip content={TOOLTIPS.collectionSize} position="top">
            <span className="cursor-help">{formatBytes(collection.size)}</span>
          </Tooltip>
        </div>
      </button>
      {isExpanded && !collection.error && (
        <div className="px-10 pb-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <Tooltip content={TOOLTIPS.storageSize} position="top">
            <div className="cursor-help">
              <p className="text-muted">Storage Size</p>
              <p className="text-text font-medium">{formatBytes(collection.storageSize)}</p>
            </div>
          </Tooltip>
          <Tooltip content={TOOLTIPS.avgDocSize} position="top">
            <div className="cursor-help">
              <p className="text-muted">Avg Doc Size</p>
              <p className="text-text font-medium">{formatBytes(collection.avgObjSize)}</p>
            </div>
          </Tooltip>
          <Tooltip content={TOOLTIPS.totalIndexSize} position="top">
            <div className="cursor-help">
              <p className="text-muted">Total Index Size</p>
              <p className="text-text font-medium">{formatBytes(collection.totalIndexSize)}</p>
            </div>
          </Tooltip>
          <Tooltip content={TOOLTIPS.indexCount} position="top">
            <div className="cursor-help">
              <p className="text-muted">Indexes</p>
              <p className="text-text font-medium">{collection.indexCount}</p>
            </div>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// Document count icon and tooltip mapping
const DOC_CONFIG = {
  users: { icon: Users, tooltip: TOOLTIPS.users },
  notes: { icon: FileText, tooltip: TOOLTIPS.notes },
  tasks: { icon: CheckSquare, tooltip: TOOLTIPS.tasks },
  projects: { icon: Briefcase, tooltip: TOOLTIPS.projects },
  events: { icon: Calendar, tooltip: TOOLTIPS.events },
  images: { icon: Image, tooltip: TOOLTIPS.images },
  files: { icon: FolderOpen, tooltip: TOOLTIPS.files },
  folders: { icon: FolderOpen, tooltip: TOOLTIPS.folders },
  logs: { icon: ScrollText, tooltip: TOOLTIPS.logs },
  lifeAreas: { icon: LayoutGrid, tooltip: TOOLTIPS.lifeAreas },
  tags: { icon: Tag, tooltip: TOOLTIPS.tags },
};

// Slow query row with tooltips
function SlowQueryRow({ query }) {
  return (
    <div className="p-3 bg-bg rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              query.method === 'GET' ? 'bg-blue-500/10 text-blue-500' :
              query.method === 'POST' ? 'bg-green-500/10 text-green-500' :
              query.method === 'PATCH' || query.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-red-500/10 text-red-500'
            }`}>
              {query.method}
            </span>
            <span className="text-sm text-text truncate">{query.route}</span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted">
            <Tooltip content={TOOLTIPS.occurrences} position="top">
              <span className="cursor-help">{query.count} occurrences</span>
            </Tooltip>
            <span>Last: {new Date(query.lastOccurred).toLocaleDateString()}</span>
          </div>
        </div>
        <Tooltip content={TOOLTIPS.avgDuration} position="left">
          <div className="text-right flex-shrink-0 cursor-help">
            <p className="text-lg font-bold text-orange-500">{query.avgDuration}ms</p>
            <p className="text-xs text-muted">avg</p>
          </div>
        </Tooltip>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <Tooltip content={TOOLTIPS.minDuration} position="top">
          <span className="text-muted cursor-help">Min: <span className="text-text">{query.minDuration}ms</span></span>
        </Tooltip>
        <Tooltip content={TOOLTIPS.maxDuration} position="top">
          <span className="text-muted cursor-help">Max: <span className="text-text">{query.maxDuration}ms</span></span>
        </Tooltip>
      </div>
    </div>
  );
}

// Section header with tooltip
function SectionHeader({ title, subtitle, tooltip }) {
  return (
    <div>
      <h2 className="text-lg font-medium text-text">
        {title}
        {tooltip && <InfoIcon tooltip={tooltip} />}
      </h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export default function AdminDatabasePage() {
  const [expandedCollections, setExpandedCollections] = useState(new Set());
  const [slowQueryDays, setSlowQueryDays] = useState(7);

  // Fetch database metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['admin-database-metrics'],
    queryFn: () => adminApi.getDatabaseMetrics().then(res => res.data),
    refetchInterval: 60000,
  });

  // Fetch health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['admin-database-health'],
    queryFn: () => adminApi.getDatabaseHealth().then(res => res.data),
    refetchInterval: 30000,
  });

  // Fetch slow queries
  const { data: slowQueries, isLoading: slowLoading } = useQuery({
    queryKey: ['admin-slow-queries', slowQueryDays],
    queryFn: () => adminApi.getSlowQueries({ days: slowQueryDays, minDuration: 500 }).then(res => res.data),
  });

  const toggleCollection = (name) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isLoading = metricsLoading || healthLoading;

  return (
    <div className="px-6 py-8">
      <AdminNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-text">Database Metrics</span>
          <Tooltip content="Real-time MongoDB database statistics and performance metrics" position="right">
            <Info className="w-4 h-4 text-muted cursor-help" />
          </Tooltip>
        </div>
        <div className="flex items-center gap-3">
          {health && <HealthBadge healthy={health.healthy} latency={health.checks?.ping?.latencyMs} />}
          <Tooltip content="Refresh all metrics" position="bottom">
            <button
              onClick={() => refetchMetrics()}
              disabled={metricsLoading}
              className="p-2 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>

      {metricsError ? (
        <div className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">Failed to load database metrics</p>
          <p className="text-sm text-muted mt-1">{metricsError.message}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Database Size"
              value={`${metrics.database?.totalSizeMB || 0} MB`}
              subtitle={`${formatNumber(metrics.database?.objects)} total objects`}
              icon={HardDrive}
              color="primary"
              tooltip={TOOLTIPS.databaseSize}
            />
            <StatCard
              title="Data Size"
              value={`${metrics.database?.dataSizeMB || 0} MB`}
              subtitle={`Avg object: ${formatBytes(metrics.database?.avgObjSize)}`}
              icon={Database}
              color="blue-500"
              tooltip={TOOLTIPS.dataSize}
            />
            <StatCard
              title="Index Size"
              value={`${metrics.database?.indexSizeMB || 0} MB`}
              subtitle={`${metrics.database?.collections || 0} collections`}
              icon={Zap}
              color="yellow-500"
              tooltip={TOOLTIPS.indexSize}
            />
            <StatCard
              title="Connection"
              value={metrics.connection?.readyStateText || 'Unknown'}
              subtitle={`${metrics.connection?.host}:${metrics.connection?.port}`}
              icon={Server}
              color="green-500"
              tooltip={TOOLTIPS.connection}
            />
          </div>

          {/* Document Counts */}
          <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
            <SectionHeader
              title="Document Counts"
              tooltip="Total number of records stored in each collection"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
              {metrics.documentCounts && Object.entries(metrics.documentCounts)
                .filter(([key]) => key !== 'total')
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const config = DOC_CONFIG[key] || { icon: FileText, tooltip: `Total ${key} in the database` };
                  const Icon = config.icon;
                  return (
                    <Tooltip key={key} content={config.tooltip} position="top">
                      <div className="bg-bg rounded-lg p-3 text-center cursor-help hover:bg-bg/80 transition-colors">
                        <Icon className="w-5 h-5 text-muted mx-auto mb-2" />
                        <p className="text-lg font-bold text-text">{formatNumber(count)}</p>
                        <p className="text-xs text-muted capitalize">{key}</p>
                      </div>
                    </Tooltip>
                  );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-border text-center">
              <Tooltip content={TOOLTIPS.totalObjects} position="top">
                <p className="text-sm text-muted cursor-help inline-block">
                  Total Documents: <span className="text-text font-medium">{formatNumber(metrics.documentCounts?.total)}</span>
                </p>
              </Tooltip>
            </div>
          </div>

          {/* Growth Stats */}
          <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
            <SectionHeader
              title="Growth (Last 30 Days)"
              tooltip="How quickly your database is growing with new content"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {metrics.growth && Object.entries(metrics.growth).map(([key, data]) => (
                <div key={key} className="bg-bg rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text capitalize">{key}</span>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Tooltip content={TOOLTIPS.last7Days} position="top">
                      <div className="cursor-help">
                        <p className="text-2xl font-bold text-text">{data.last7Days}</p>
                        <p className="text-xs text-muted">Last 7 days</p>
                      </div>
                    </Tooltip>
                    <Tooltip content={TOOLTIPS.last30Days} position="top">
                      <div className="cursor-help">
                        <p className="text-2xl font-bold text-text">{data.last30Days}</p>
                        <p className="text-xs text-muted">Last 30 days</p>
                      </div>
                    </Tooltip>
                  </div>
                  <Tooltip content={TOOLTIPS.avgPerDay} position="top">
                    <p className="text-xs text-muted mt-2 cursor-help inline-block">
                      Avg: {data.avgPerDay30}/day
                    </p>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>

          {/* Collections */}
          <div className="bg-panel border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <SectionHeader
                title="Collections"
                subtitle="Sorted by size (largest first)"
                tooltip="MongoDB collections are like tables in a relational database. Each stores a specific type of document."
              />
            </div>
            <div className="max-h-96 overflow-auto">
              {metrics.collections?.map((collection) => (
                <CollectionRow
                  key={collection.name}
                  collection={collection}
                  isExpanded={expandedCollections.has(collection.name)}
                  onToggle={() => toggleCollection(collection.name)}
                />
              ))}
            </div>
          </div>

          {/* Slow Queries */}
          <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                title="Slow Queries"
                subtitle="Requests taking 500ms+"
                tooltip={TOOLTIPS.slowQueries}
              />
              <select
                value={slowQueryDays}
                onChange={(e) => setSlowQueryDays(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
            {slowLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted animate-spin" />
              </div>
            ) : slowQueries?.slowQueries?.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-auto">
                {slowQueries.slowQueries.map((query, i) => (
                  <SlowQueryRow key={i} query={query} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted">No slow queries detected</p>
                <p className="text-xs text-muted mt-1">All requests completed in under 500ms</p>
              </div>
            )}

            {/* Duration Distribution */}
            {slowQueries?.distribution?.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-text">Response Time Distribution</h3>
                  <InfoIcon tooltip={TOOLTIPS.responseDistribution} />
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {slowQueries.distribution.map((bucket, i) => (
                    <Tooltip key={i} content={`${bucket.count} requests completed in ${bucket.range}`} position="top">
                      <div className="text-center cursor-help">
                        <div className="bg-bg rounded p-2 hover:bg-bg/80 transition-colors">
                          <p className="text-sm font-medium text-text">{formatNumber(bucket.count)}</p>
                        </div>
                        <p className="text-xs text-muted mt-1">{bucket.range}</p>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Server Info */}
          {metrics.server && !metrics.server.error && (
            <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
              <SectionHeader
                title="Server Info"
                tooltip="MongoDB server details and performance counters"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {metrics.server.version && (
                  <Tooltip content={TOOLTIPS.mongoVersion} position="top">
                    <div className="cursor-help">
                      <p className="text-sm text-muted">MongoDB Version</p>
                      <p className="text-text font-medium">{metrics.server.version}</p>
                    </div>
                  </Tooltip>
                )}
                {metrics.server.uptimeDays && (
                  <Tooltip content={TOOLTIPS.uptime} position="top">
                    <div className="cursor-help">
                      <p className="text-sm text-muted">Uptime</p>
                      <p className="text-text font-medium">{metrics.server.uptimeDays} days</p>
                    </div>
                  </Tooltip>
                )}
                {metrics.server.currentConnections !== undefined && (
                  <Tooltip content={TOOLTIPS.currentConnections} position="top">
                    <div className="cursor-help">
                      <p className="text-sm text-muted">Current Connections</p>
                      <p className="text-text font-medium">{metrics.server.currentConnections}</p>
                    </div>
                  </Tooltip>
                )}
                {metrics.server.availableConnections !== undefined && (
                  <Tooltip content={TOOLTIPS.availableConnections} position="top">
                    <div className="cursor-help">
                      <p className="text-sm text-muted">Available Connections</p>
                      <p className="text-text font-medium">{metrics.server.availableConnections}</p>
                    </div>
                  </Tooltip>
                )}
              </div>
              {metrics.server.opcounters && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm text-muted">Operation Counters (since server start)</p>
                    <InfoIcon tooltip="Total database operations since MongoDB server started. Useful for understanding workload patterns." />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {Object.entries(metrics.server.opcounters).map(([op, count]) => (
                      <Tooltip key={op} content={TOOLTIPS[op] || `Total ${op} operations`} position="top">
                        <div className="bg-bg rounded p-2 text-center cursor-help hover:bg-bg/80 transition-colors">
                          <p className="text-sm font-medium text-text">{formatNumber(count)}</p>
                          <p className="text-xs text-muted capitalize">{op}</p>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <Tooltip content="Data is refreshed automatically every minute" position="top">
            <p className="text-xs text-muted text-center cursor-help">
              Last updated: {new Date(metrics.timestamp).toLocaleString()}
            </p>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
