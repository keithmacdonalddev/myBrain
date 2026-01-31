/**
 * NotesWidgetV2 - Recent notes widget for V2 dashboard
 *
 * Features:
 * - Note cards with title, preview text (2-line clamp), and meta
 * - Meta shows folder and relative date
 * - Filter dropdown: Recent/Favorites/All
 * - Hover actions: Delete button
 * - Click to open note in panel
 */

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

/**
 * Extract plain text preview from note content
 * Handles both plain text and potential rich text formats
 *
 * @param {string} content - Note content (plain text or rich text)
 * @param {number} maxLength - Maximum preview length
 * @returns {string} Plain text preview
 */
const getPreviewText = (content, maxLength = 150) => {
  if (!content) return '';

  // If content is plain text, just truncate it
  let text = content;

  // Strip HTML tags if present (basic sanitization)
  text = text.replace(/<[^>]*>/g, ' ');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...';
  }

  return text;
};

function NotesWidgetV2({ notes = [] }) {
  const { openNote, openNewNote } = useNotePanel();
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState(null);
  const [filter, setFilter] = useState('recent');

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

  /**
   * Handle filter dropdown change
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Format the date for display
   * Shows relative time like "Today", "Yesterday", "2 days ago"
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: false });
  };

  const isEmpty = notes.length === 0;

  /**
   * Render a single note card matching the prototype design
   */
  const renderNoteCard = (note) => (
    <div
      key={note._id}
      className="note-card"
      onClick={() => openNote(note._id)}
    >
      {/* Note title */}
      <p className="note-title">{note.title || 'Untitled'}</p>

      {/* Note preview - 2-line clamp handled by CSS */}
      <p className="note-preview">
        {getPreviewText(note.content)}
      </p>

      {/* Note meta: folder and date */}
      <div className="note-meta">
        {note.folder && (
          <>
            <span>&#128193; {note.folder}</span>
            <span>-</span>
          </>
        )}
        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
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
    </div>
  );

  return (
    <div className="widget">
      {/* Widget header with title and filter dropdown */}
      <div className="widget-header">
        <span className="widget-title">&#128221; Recent Notes</span>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
          aria-label="Filter notes"
        >
          <option value="recent">Recent</option>
          <option value="favorites">Favorites</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Note cards */}
      {isEmpty ? (
        <div className="v2-empty-state">
          <p>No recent notes</p>
          <button className="v2-btn v2-btn--secondary" onClick={openNewNote} aria-label="Create a note">
            Create a note
          </button>
        </div>
      ) : (
        <div className="note-cards">
          {notes.slice(0, 5).map(renderNoteCard)}
        </div>
      )}

      {/* Add note button - only show when not empty */}
      {!isEmpty && (
        <button className="add-task-btn" onClick={openNewNote} aria-label="New note">
          + New Note
        </button>
      )}

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
    </div>
  );
}

export default NotesWidgetV2;
