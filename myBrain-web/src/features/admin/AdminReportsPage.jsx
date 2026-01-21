import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Flag,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  MessageSquare,
  FileText,
  FolderKanban,
  CheckSquare,
  StickyNote,
  File,
  Loader2,
  ChevronDown,
  ExternalLink,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import AdminNav from './components/AdminNav';
import UserAvatar from '../../components/ui/UserAvatar';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
  reviewing: { label: 'Reviewing', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Eye },
  resolved: { label: 'Resolved', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
  dismissed: { label: 'Dismissed', color: 'text-muted', bg: 'bg-bg', icon: XCircle },
};

const REASON_CONFIG = {
  spam: { label: 'Spam', color: 'text-orange-500' },
  harassment: { label: 'Harassment', color: 'text-red-500' },
  hate_speech: { label: 'Hate Speech', color: 'text-red-600' },
  inappropriate_content: { label: 'Inappropriate Content', color: 'text-pink-500' },
  impersonation: { label: 'Impersonation', color: 'text-purple-500' },
  copyright: { label: 'Copyright', color: 'text-blue-500' },
  privacy_violation: { label: 'Privacy Violation', color: 'text-indigo-500' },
  scam: { label: 'Scam', color: 'text-red-500' },
  other: { label: 'Other', color: 'text-muted' },
};

const TARGET_TYPE_CONFIG = {
  user: { label: 'User', icon: User, color: 'text-blue-500' },
  message: { label: 'Message', icon: MessageSquare, color: 'text-green-500' },
  project: { label: 'Project', icon: FolderKanban, color: 'text-purple-500' },
  task: { label: 'Task', icon: CheckSquare, color: 'text-blue-500' },
  note: { label: 'Note', icon: StickyNote, color: 'text-yellow-500' },
  file: { label: 'File', icon: File, color: 'text-orange-500' },
  share: { label: 'Share', icon: FileText, color: 'text-teal-500' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-500/20' },
  high: { label: 'High', color: 'text-red-500', bg: 'bg-red-500/10' },
  medium: { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  low: { label: 'Low', color: 'text-muted', bg: 'bg-bg' },
};

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReportCard({ report, onView, onResolve, onDismiss, isUpdating }) {
  const statusConfig = STATUS_CONFIG[report.status];
  const reasonConfig = REASON_CONFIG[report.reason];
  const targetConfig = TARGET_TYPE_CONFIG[report.targetType];
  const priorityConfig = PRIORITY_CONFIG[report.priority];
  const StatusIcon = statusConfig?.icon || Clock;
  const TargetIcon = targetConfig?.icon || FileText;

  return (
    <div className="bg-panel border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${priorityConfig?.bg}`}>
            <Flag className={`w-4 h-4 ${priorityConfig?.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${reasonConfig?.color}`}>
                {reasonConfig?.label}
              </span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${statusConfig?.bg} ${statusConfig?.color}`}>
                {statusConfig?.label}
              </span>
            </div>
            <p className="text-xs text-muted">{formatDate(report.createdAt)}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs ${targetConfig?.color}`}>
          <TargetIcon className="w-3.5 h-3.5" />
          {targetConfig?.label}
        </div>
      </div>

      {/* Reporter */}
      <div className="flex items-center gap-2 mb-3">
        <UserAvatar user={report.reporterId} size="xs" />
        <span className="text-xs text-muted">
          Reported by <span className="text-text">{report.reporterId?.profile?.displayName || report.reporterId?.email}</span>
        </span>
      </div>

      {/* Reported User */}
      {report.reportedUserId && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-bg rounded-lg">
          <UserAvatar user={report.reportedUserId} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {report.reportedUserId?.profile?.displayName || report.reportedUserId?.email}
            </p>
            <p className="text-xs text-muted">Reported User</p>
          </div>
        </div>
      )}

      {/* Description */}
      {report.description && (
        <p className="text-sm text-muted mb-3 line-clamp-2">{report.description}</p>
      )}

      {/* Content Snapshot Preview */}
      {report.contentSnapshot && (
        <div className="p-2 bg-bg rounded-lg mb-3 text-xs text-muted">
          {report.contentSnapshot.title && (
            <p className="font-medium text-text truncate">{report.contentSnapshot.title}</p>
          )}
          {report.contentSnapshot.content && (
            <p className="truncate mt-1">{report.contentSnapshot.content}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={() => onView(report)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View Details
        </button>
        {report.status === 'pending' && (
          <>
            <button
              onClick={() => onResolve(report._id)}
              disabled={isUpdating}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Resolve
            </button>
            <button
              onClick={() => onDismiss(report._id)}
              disabled={isUpdating}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-text hover:bg-bg rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReportDetailsModal({ report, onClose, onResolve, onDismiss, isUpdating }) {
  const navigate = useNavigate();
  const [action, setAction] = useState('no_action');
  const [notes, setNotes] = useState('');

  const statusConfig = STATUS_CONFIG[report.status];
  const reasonConfig = REASON_CONFIG[report.reason];
  const targetConfig = TARGET_TYPE_CONFIG[report.targetType];
  const priorityConfig = PRIORITY_CONFIG[report.priority];
  const TargetIcon = targetConfig?.icon || FileText;

  const handleResolve = () => {
    onResolve(report._id, action, notes);
  };

  const handleDismiss = () => {
    onDismiss(report._id, notes);
  };

  const handleViewUser = (userId) => {
    navigate(`/admin/users?user=${userId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-panel border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className={`w-5 h-5 ${priorityConfig?.color}`} />
            <h2 className="text-lg font-semibold text-text">Report Details</h2>
            <span className={`px-2 py-0.5 text-xs rounded ${statusConfig?.bg} ${statusConfig?.color}`}>
              {statusConfig?.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Report Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted mb-1">Reason</p>
              <p className={`text-sm font-medium ${reasonConfig?.color}`}>{reasonConfig?.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Target Type</p>
              <div className={`flex items-center gap-1.5 text-sm ${targetConfig?.color}`}>
                <TargetIcon className="w-4 h-4" />
                {targetConfig?.label}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Priority</p>
              <span className={`px-2 py-0.5 text-xs rounded ${priorityConfig?.bg} ${priorityConfig?.color}`}>
                {priorityConfig?.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Submitted</p>
              <p className="text-sm text-text">{formatDate(report.createdAt)}</p>
            </div>
          </div>

          {/* Reporter */}
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">Reporter</p>
            <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
              <UserAvatar user={report.reporterId} size="md" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {report.reporterId?.profile?.displayName || 'Unknown'}
                </p>
                <p className="text-xs text-muted">{report.reporterId?.email}</p>
              </div>
              {report.reporterId?._id && (
                <button
                  onClick={() => handleViewUser(report.reporterId._id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:underline"
                >
                  View <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Reported User */}
          {report.reportedUserId && (
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Reported User</p>
              <div className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <UserAvatar user={report.reportedUserId} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">
                    {report.reportedUserId?.profile?.displayName || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted">{report.reportedUserId?.email}</p>
                </div>
                {report.reportedUserId?._id && (
                  <button
                    onClick={() => handleViewUser(report.reportedUserId._id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:underline"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {report.description && (
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Description</p>
              <p className="text-sm text-text p-3 bg-bg rounded-lg">{report.description}</p>
            </div>
          )}

          {/* Content Snapshot */}
          {report.contentSnapshot && (
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Content Snapshot (at time of report)</p>
              <div className="p-3 bg-bg rounded-lg border border-border">
                {report.contentSnapshot.email && (
                  <p className="text-xs text-muted">Email: {report.contentSnapshot.email}</p>
                )}
                {report.contentSnapshot.displayName && (
                  <p className="text-xs text-muted">Display Name: {report.contentSnapshot.displayName}</p>
                )}
                {report.contentSnapshot.bio && (
                  <p className="text-xs text-muted mt-1">Bio: {report.contentSnapshot.bio}</p>
                )}
                {report.contentSnapshot.title && (
                  <p className="text-sm font-medium text-text">{report.contentSnapshot.title}</p>
                )}
                {report.contentSnapshot.content && (
                  <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{report.contentSnapshot.content}</p>
                )}
              </div>
            </div>
          )}

          {/* Resolution (if resolved) */}
          {report.resolution?.resolvedAt && (
            <div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-500 font-medium mb-2">Resolution</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted">Action Taken</p>
                  <p className="text-text capitalize">{report.resolution.action?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-muted">Resolved At</p>
                  <p className="text-text">{formatDate(report.resolution.resolvedAt)}</p>
                </div>
              </div>
              {report.resolution.notes && (
                <div className="mt-2">
                  <p className="text-muted text-xs">Notes</p>
                  <p className="text-text text-sm">{report.resolution.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Form (only for pending reports) */}
          {report.status === 'pending' && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm font-medium text-text mb-3">Take Action</p>

              <div className="mb-3">
                <label className="text-xs text-muted mb-1 block">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="no_action">No Action Required</option>
                  <option value="warning">Issue Warning to User</option>
                  <option value="content_removed">Remove Content</option>
                  <option value="user_suspended">Suspend User</option>
                  <option value="user_banned">Ban User</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="text-xs text-muted mb-1 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this resolution..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {action === 'content_removed' && (
                <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg text-orange-500 text-xs mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  This will soft-delete the reported content (it can be restored if needed)
                </div>
              )}

              {action === 'user_suspended' && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg text-yellow-500 text-xs mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  This will immediately suspend the reported user
                </div>
              )}

              {action === 'user_banned' && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg text-red-500 text-xs mb-3">
                  <Ban className="w-4 h-4" />
                  <div>
                    <strong>Warning:</strong> This will permanently ban the user. They will be completely locked out of their account.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {report.status === 'pending' && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="px-4 py-2 text-sm bg-bg border border-border text-text rounded-lg hover:bg-panel2 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              onClick={handleResolve}
              disabled={isUpdating}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Resolve'
              )}
            </button>
          </div>
        )}

        {report.status !== 'pending' && (
          <div className="flex items-center justify-end px-4 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-bg border border-border text-text rounded-lg hover:bg-panel2 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);

  // Fetch reports
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => {
      const response = await adminApi.getReports({ status: statusFilter, limit: 50 });
      return response.data;
    },
  });

  // Fetch counts
  const { data: countsData } = useQuery({
    queryKey: ['admin-reports-counts'],
    queryFn: async () => {
      const response = await adminApi.getReportCounts();
      return response.data;
    },
  });

  // Update report mutation
  const updateReport = useMutation({
    mutationFn: ({ reportId, data }) => adminApi.updateReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports-counts'] });
      setSelectedReport(null);
    },
  });

  const handleResolve = (reportId, action = 'no_action', notes = '') => {
    updateReport.mutate({
      reportId,
      data: { status: 'resolved', action, notes },
    });
  };

  const handleDismiss = (reportId, notes = '') => {
    updateReport.mutate({
      reportId,
      data: { status: 'dismissed', notes },
    });
  };

  const handleMarkReviewing = (reportId) => {
    updateReport.mutate({
      reportId,
      data: { status: 'reviewing' },
    });
  };

  const counts = countsData || { pending: 0, reviewing: 0, resolved: 0, dismissed: 0, total: 0 };
  const reports = data?.reports || [];

  return (
    <div className="px-6 py-8">
      <AdminNav
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        badgeCount={counts.pending}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-lg border transition-colors ${
            statusFilter === 'pending'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-border bg-panel hover:border-yellow-500/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-muted">Pending</span>
          </div>
          <p className="text-2xl font-bold text-text">{counts.pending}</p>
        </button>

        <button
          onClick={() => setStatusFilter('reviewing')}
          className={`p-4 rounded-lg border transition-colors ${
            statusFilter === 'reviewing'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-border bg-panel hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted">Reviewing</span>
          </div>
          <p className="text-2xl font-bold text-text">{counts.reviewing}</p>
        </button>

        <button
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-lg border transition-colors ${
            statusFilter === 'resolved'
              ? 'border-green-500 bg-green-500/10'
              : 'border-border bg-panel hover:border-green-500/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-text">{counts.resolved}</p>
        </button>

        <button
          onClick={() => setStatusFilter('dismissed')}
          className={`p-4 rounded-lg border transition-colors ${
            statusFilter === 'dismissed'
              ? 'border-border bg-bg'
              : 'border-border bg-panel hover:border-muted'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Dismissed</span>
          </div>
          <p className="text-2xl font-bold text-text">{counts.dismissed}</p>
        </button>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500 mb-2">Failed to load reports</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <Flag className="w-12 h-12 text-muted mx-auto mb-3" />
          <h3 className="text-lg font-medium text-text mb-1">No {statusFilter} reports</h3>
          <p className="text-sm text-muted">
            {statusFilter === 'pending'
              ? 'All clear! No reports need your attention.'
              : `No reports with ${statusFilter} status.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              onView={setSelectedReport}
              onResolve={(id) => handleResolve(id)}
              onDismiss={(id) => handleDismiss(id)}
              isUpdating={updateReport.isPending}
            />
          ))}
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onResolve={handleResolve}
          onDismiss={handleDismiss}
          isUpdating={updateReport.isPending}
        />
      )}
    </div>
  );
}

export default AdminReportsPage;
