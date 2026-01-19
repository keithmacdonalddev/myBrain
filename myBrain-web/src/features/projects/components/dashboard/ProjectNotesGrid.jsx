import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  ExternalLink,
  Unlink,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { useNotePanel } from '../../../../contexts/NotePanelContext';
import { useUnlinkNote } from '../../hooks/useProjects';
import { LinkItemModal } from '../LinkItemModal';
import useToast from '../../../../hooks/useToast';

export function ProjectNotesGrid({ projectId, notes = [] }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { openNewNote } = useNotePanel();
  const unlinkNote = useUnlinkNote();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState(null);

  const handleUnlink = async (noteId, e) => {
    e.stopPropagation();
    setUnlinkingId(noteId);
    try {
      await unlinkNote.mutateAsync({ projectId, noteId });
      toast.success('Note unlinked');
    } catch (err) {
      toast.error('Failed to unlink note');
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleNoteClick = (noteId) => {
    navigate(`/app/notes/${noteId}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (body) => {
    if (!body) return '';
    const stripped = body.replace(/[#*_~`>\[\]]/g, '').trim();
    return stripped.length > 60 ? stripped.slice(0, 60) + '...' : stripped;
  };

  return (
    <div className="flex-1 flex flex-col bg-panel border border-border rounded-xl overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-text">Notes</span>
          <span className="text-xs text-muted">({notes.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLinkModal(true)}
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            title="Link existing note"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => openNewNote()}
            className="p-1.5 text-muted hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
            title="Create new note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <StickyNote className="w-6 h-6 text-muted/30 mb-2" />
            <p className="text-xs text-muted text-center">No notes linked</p>
            <button
              onClick={() => setShowLinkModal(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Link a note
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {notes.map((note) => (
              <div
                key={note._id}
                onClick={() => handleNoteClick(note._id)}
                className="group flex items-start gap-2 p-2 rounded-lg hover:bg-bg cursor-pointer transition-colors"
              >
                <StickyNote className="w-3.5 h-3.5 text-blue-500/50 mt-0.5 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate group-hover:text-primary transition-colors">
                    {note.title || 'Untitled Note'}
                  </p>
                  {note.body && (
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {getPreview(note.body)}
                    </p>
                  )}
                  <p className="text-[10px] text-muted/70 mt-0.5">
                    {formatDate(note.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/notes/${note._id}`);
                    }}
                    className="p-1 text-muted hover:text-primary rounded transition-colors"
                    title="Open"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleUnlink(note._id, e)}
                    disabled={unlinkingId === note._id}
                    className="p-1 text-muted hover:text-danger rounded transition-colors"
                    title="Unlink"
                  >
                    {unlinkingId === note._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Unlink className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkItemModal
          projectId={projectId}
          linkedIds={notes.map(n => n._id)}
          type="notes"
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
}

export default ProjectNotesGrid;
