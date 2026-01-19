import { useState } from 'react';
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

/**
 * CommentsSection - Expandable comments panel for tasks and projects
 *
 * Props:
 * - comments: Array of comment objects
 * - onAdd: (text) => void - Add a new comment
 * - onUpdate: (commentId, text) => void - Update existing comment
 * - onDelete: (commentId) => void - Delete a comment
 * - isAdding: boolean - Loading state for adding
 * - isUpdating: boolean - Loading state for updating
 * - isDeleting: boolean - Loading state for deleting
 */
function CommentsSection({
  comments = [],
  onAdd,
  onUpdate,
  onDelete,
  isAdding = false,
  isUpdating = false,
  isDeleting = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Get current user from auth state
  const currentUser = useSelector(state => state.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id;

  const commentCount = comments?.length || 0;

  const handleAddComment = () => {
    if (!newComment.trim() || isAdding) return;
    onAdd(newComment.trim());
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
    onUpdate(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUpdateComment();
    }
    if (e.key === 'Escape') {
      cancelEditing();
    }
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

  const wasEdited = (comment) => {
    if (!comment.createdAt || !comment.updatedAt) return false;
    const created = new Date(comment.createdAt).getTime();
    const updated = new Date(comment.updatedAt).getTime();
    return updated - created > 1000; // More than 1 second difference
  };

  return (
    <div className="border-t border-border">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-bg/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs text-muted">
            {commentCount === 0
              ? 'Comments'
              : `${commentCount} comment${commentCount === 1 ? '' : 's'}`}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Add Comment Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment..."
              maxLength={2000}
              className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isAdding}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Comments List */}
          {commentCount > 0 && (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className="group p-2.5 bg-bg rounded-lg"
                >
                  {editingId === comment._id ? (
                    /* Edit Mode */
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        maxLength={2000}
                        autoFocus
                        className="flex-1 px-2 py-1 bg-panel border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim() || isUpdating}
                        className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 text-muted hover:bg-bg rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <p className="text-sm text-text whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted">
                          {formatTimestamp(comment.createdAt)}
                          {wasEdited(comment) && (
                            <span className="ml-1 text-muted/70">(edited)</span>
                          )}
                        </span>

                        {/* Actions - only for own comments */}
                        {isOwner(comment) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(comment)}
                              className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDelete(comment._id)}
                              disabled={isDeleting}
                              className="p-1 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {commentCount === 0 && (
            <p className="text-xs text-muted text-center py-2">
              No comments yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CommentsSection;
