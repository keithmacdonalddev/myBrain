/**
 * NotesWidgetV2 - Recent notes widget for V2 dashboard
 *
 * Shows recent notes with inline delete action on hover.
 * Delete requires confirmation before removing the note.
 */

import { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

function NotesWidgetV2({ notes = [] }) {
  const { openNote, openNewNote } = useNotePanel();
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState(null);

  // Query client for cache invalidation after mutations
  const queryClient = useQueryClient();

  /**
   * Mutation for deleting a note
   * Uses DELETE /api/notes/:id endpoint
   */
  const deleteNote = useMutation({
    mutationFn: async (noteId) => {
      return api.delete(`/notes/${noteId}`);
    },
    onSuccess: () => {
      // Refresh dashboard data after successful deletion
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Handle delete action - stops event propagation and opens
   * the confirmation dialog instead of using window.confirm
   */
  const handleDelete = (e, noteId) => {
    e.stopPropagation();
    setDeleteConfirmNoteId(noteId);
  };

  const isEmpty = notes.length === 0;

  const renderNoteItem = (note) => (
    <li
      key={note._id}
      className="v2-note-item"
      onClick={() => openNote(note._id)}
    >
      <FileText className="v2-icon-sm v2-note-icon" />
      <div className="v2-note-content">
        <span className="v2-note-title">{note.title || 'Untitled'}</span>
        <span className="v2-note-time">
          {formatDistanceToNow(new Date(note.updatedAt || note.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Hover action buttons */}
      <div className="v2-note-actions">
        <button
          className="v2-item-action v2-item-action--danger"
          onClick={(e) => handleDelete(e, note._id)}
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 className="v2-icon-sm" />
        </button>
      </div>
    </li>
  );

  return (
    <section className="v2-widget v2-widget--notes">
      <div className="v2-widget__header">
        <h2 className="v2-widget__title">Recent Notes</h2>
        <button className="v2-widget__action" onClick={openNewNote}>
          + New
        </button>
      </div>

      <div className="v2-widget__content">
        {isEmpty ? (
          <div className="v2-empty-state">
            <p>No recent notes</p>
            <button className="v2-btn v2-btn--secondary" onClick={openNewNote}>
              Create a note
            </button>
          </div>
        ) : (
          <ul className="v2-note-list">
            {notes.slice(0, 5).map(renderNoteItem)}
          </ul>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmNoteId !== null}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteNote.mutate(deleteConfirmNoteId);
          setDeleteConfirmNoteId(null);
        }}
        onCancel={() => setDeleteConfirmNoteId(null)}
        variant="danger"
      />
    </section>
  );
}

export default NotesWidgetV2;
