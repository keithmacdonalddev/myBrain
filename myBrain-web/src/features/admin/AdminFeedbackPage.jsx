import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Bug, Lightbulb, HelpCircle, Filter, RefreshCw, ExternalLink } from 'lucide-react';
import { feedbackApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import AdminNav from './components/AdminNav';

// TODO: Phase 2 - Add response templates for quick replies
// TODO: Phase 2 - Add bulk actions (mark as resolved, assign, etc.)
// TODO: Phase 2 - Add feedback filters by date range
// TODO: Phase 2 - Add feedback analytics dashboard
// TODO: Phase 3 - Add feedback detail page with full metadata display
// TODO: Phase 3 - Add ability to send AdminMessage response from this page
// TODO: Phase 4 - Add feedback trends and insights
// TODO: Phase 4 - Add automatic duplicate detection

/**
 * AdminFeedbackPage - Manage user feedback submissions
 *
 * This page allows admins to:
 * - View all feedback submissions
 * - Filter by type and status
 * - See linked tasks
 * - Update feedback status
 * - View submitter information and metadata
 *
 * Phase 2+ enhancements:
 * - Response templates for quick replies
 * - Bulk actions
 * - Analytics and trends
 */
export default function AdminFeedbackPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: 'new',
    priority: ''
  });

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await feedbackApi.getAllFeedback({
        ...filters,
        limit: 50
      });
      setFeedback(response.data.feedback || []);
      setCounts(response.data.counts || {});
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError(err.message || 'Failed to load feedback');
      showToast('Failed to load feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFeedback();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchFeedback();
    // TODO: Phase 2 - Set up real-time updates via WebSocket for new feedback
    // TODO: Phase 2 - Add polling interval as fallback
  }, [filters]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4" />;
      case 'feature_request':
        return <Lightbulb className="w-4 h-4" />;
      case 'question':
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'bug':
        return 'Bug Report';
      case 'feature_request':
        return 'Feature Request';
      case 'question':
        return 'Question';
      default:
        return 'General';
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-500/10 text-blue-600 border-blue-200',
      in_review: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      awaiting_reply: 'bg-orange-500/10 text-orange-600 border-orange-200',
      planned: 'bg-purple-500/10 text-purple-600 border-purple-200',
      in_progress: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      resolved: 'bg-green-500/10 text-green-600 border-green-200',
      closed: 'bg-gray-500/10 text-gray-600 border-gray-200',
      verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
    };

    const labels = {
      new: 'New',
      in_review: 'In Review',
      awaiting_reply: 'Awaiting Reply',
      planned: 'Planned',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
      verified: 'Verified'
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || styles.new}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      critical: 'bg-red-500/10 text-red-600 border-red-200',
      high: 'bg-orange-500/10 text-orange-600 border-orange-200',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
      low: 'bg-gray-500/10 text-gray-600 border-gray-200'
    };

    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[priority] || styles.medium}`}>
        {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AdminNav onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text">{counts.new || 0}</div>
          <div className="text-sm text-muted">New</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text">{counts.in_progress || 0}</div>
          <div className="text-sm text-muted">In Progress</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text">{counts.resolved || 0}</div>
          <div className="text-sm text-muted">Resolved</div>
        </div>
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text">{counts.total || 0}</div>
          <div className="text-sm text-muted">Total</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-panel border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-text">Filters:</span>
          </div>

          <select
            value={filters.type}
            onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
            className="px-3 py-1.5 bg-bg border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value="bug">Bug Report</option>
            <option value="feature_request">Feature Request</option>
            <option value="question">Question</option>
            <option value="general">General</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-1.5 bg-bg border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="awaiting_reply">Awaiting Reply</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
            className="px-3 py-1.5 bg-bg border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {(filters.type || filters.status || filters.priority) && (
            <button
              onClick={() => setFilters({ type: '', status: 'new', priority: '' })}
              className="text-sm text-muted hover:text-text underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-muted animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading feedback...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-danger mb-4">{error}</p>
          <button
            onClick={fetchFeedback}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12 bg-panel border border-border rounded-lg">
          <MessageSquare className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">No feedback yet</h3>
          <p className="text-muted">When users submit feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item._id}
              className="bg-panel border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-bg flex items-center justify-center text-muted">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-text truncate">{item.title}</h4>
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                  </div>

                  <p className="text-sm text-muted line-clamp-2 mb-2">
                    {item.description || 'No description provided'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{getTypeLabel(item.type)}</span>
                    <span>•</span>
                    <span>Ref: {item.referenceId}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.submittedBy?.displayName && (
                      <>
                        <span>•</span>
                        <span>By: {item.submittedBy.displayName}</span>
                      </>
                    )}
                    {item.submittedBy?.isAnonymous && (
                      <>
                        <span>•</span>
                        <span>Anonymous</span>
                      </>
                    )}
                    {item.includedDiagnostics && (
                      <>
                        <span>•</span>
                        <span className="text-primary">Has diagnostics</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {item.linkedTaskId && (
                    <button
                      onClick={() => navigate(`/app/projects?task=${item.linkedTaskId}`)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                      title="View linked task"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  {/* TODO: Phase 2 - Add quick action buttons (Mark as resolved, Assign, etc.) */}
                  {/* TODO: Phase 3 - Add "Respond" button that opens AdminMessage modal */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted">
        <p>
          {/* TODO: Phase 4 - Add link to feedback analytics */}
          Feedback helps improve myBrain. Thank you for reviewing submissions.
        </p>
      </div>
    </div>
  );
}
