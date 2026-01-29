import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  Target,
  Calendar,
  Flag,
  Folder,
  Tag as TagIcon,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LifeAreaBadge } from '../../../lifeAreas/components/LifeAreaBadge';

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-red-500' },
  medium: { label: 'Medium', color: 'text-amber-500' },
  low: { label: 'Low', color: 'text-gray-400' },
};

export function ProjectActivityFeed({
  project,
  comments = [],
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  isAdding = false,
  isUpdating = false,
  isDeleting = false
}) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [activeSection, setActiveSection] = useState('comments'); // 'comments' | 'details'

  const currentUser = useSelector(state => state.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id;

  const handleAddComment = () => {
    if (!newComment.trim() || isAdding) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const startEditing = (comment) => {
    setEditingId(comment._id);
    setEditText(comment.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleUpdateComment = () => {
    if (!editText.trim() || isUpdating) return;
    onUpdateComment(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const formatTimestamp = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const isOwner = (comment) => {
    return comment.userId === currentUserId || comment.userId?._id === currentUserId;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-[380px] bg-panel border border-border rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSection('comments')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'comments'
              ? 'text-primary border-primary'
              : 'text-muted border-transparent hover:text-text'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Comments
          {comments.length > 0 && <span className="text-[10px] opacity-70">({comments.length})</span>}
        </button>
        <button
          onClick={() => setActiveSection('details')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'details'
              ? 'text-primary border-primary'
              : 'text-muted border-transparent hover:text-text'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          Details
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSection === 'comments' ? (
          <>
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <MessageSquare className="w-6 h-6 text-muted/30 mb-2" />
                  <p className="text-xs text-muted">No comments yet</p>
                  <p className="text-[10px] text-muted/70 mt-1">Start the conversation</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="group p-2 bg-bg rounded-lg">
                    {editingId === comment._id ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateComment();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 bg-panel border border-border rounded text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim() || isUpdating}
                          className="p-1 text-green-500 hover:bg-green-500/10 rounded disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button onClick={cancelEditing} className="p-1 text-muted hover:bg-bg rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-text whitespace-pre-wrap break-words">{comment.text}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted">
                            {formatTimestamp(comment.createdAt)}
                          </span>
                          {isOwner(comment) && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(comment)}
                                className="p-0.5 text-muted hover:text-primary rounded"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => onDeleteComment(comment._id)}
                                disabled={isDeleting}
                                className="p-0.5 text-muted hover:text-red-500 rounded disabled:opacity-50"
                              >
                                {isDeleting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <div className="p-2 border-t border-border">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment..."
                  className="flex-1 px-2.5 py-1.5 bg-bg border border-border rounded-lg text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isAdding}
                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Details Section */
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Description */}
            {project.description && (
              <div>
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider">Description</label>
                <p className="text-xs text-text mt-1 leading-relaxed">{project.description}</p>
              </div>
            )}

            {/* Outcome */}
            {project.outcome && (
              <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg">
                <Target className="w-3.5 h-3.5 text-primary mt-0.5" />
                <div>
                  <label className="text-[10px] font-medium text-primary uppercase tracking-wider">Goal</label>
                  <p className="text-xs text-text mt-0.5">{project.outcome}</p>
                </div>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="space-y-2">
              {/* Category */}
              {project.lifeArea && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-[10px] text-muted flex items-center gap-1">
                    <Folder className="w-3 h-3" />
                    Category
                  </span>
                  <LifeAreaBadge lifeArea={project.lifeArea} size="xs" />
                </div>
              )}

              {/* Priority */}
              {project.priority && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-[10px] text-muted flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    Priority
                  </span>
                  <span className={`text-xs font-medium ${PRIORITY_CONFIG[project.priority]?.color || 'text-text'}`}>
                    {PRIORITY_CONFIG[project.priority]?.label || project.priority}
                  </span>
                </div>
              )}

              {/* Deadline */}
              {project.deadline && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-[10px] text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Deadline
                  </span>
                  <span className="text-xs text-text">{formatDate(project.deadline)}</span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-[10px] text-muted">Created</span>
                <span className="text-xs text-text">{formatDate(project.createdAt)}</span>
              </div>

              {/* Updated */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[10px] text-muted">Updated</span>
                <span className="text-xs text-text">{formatDate(project.updatedAt)}</span>
              </div>
            </div>

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div>
                <label className="text-[10px] font-medium text-muted uppercase tracking-wider flex items-center gap-1">
                  <TagIcon className="w-3 h-3" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {project.tags.map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-bg rounded text-[10px] text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectActivityFeed;
