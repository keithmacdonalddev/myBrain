/**
 * InboxWidgetV2 - Inbox triage widget for V2 dashboard
 *
 * Shows inbox items (notes marked as inbox) with inline triage actions:
 * - "-> Task": Converts the inbox item to a task
 * - "-> Note": Archives the item (removes from inbox but keeps as note)
 * - Trash icon: Permanently deletes the item
 *
 * Features:
 * - Filter dropdown (All, Unprocessed, Recent)
 * - Item count header
 * - "Process All Items" button
 * - Click item to open in note panel
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';

/**
 * InboxWidgetV2 Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of inbox item objects with _id, title, content, createdAt
 * @returns {JSX.Element} Inbox widget with triage functionality
 */
function InboxWidgetV2({ items = [] }) {
  // Note panel context for opening items
  const { openNote } = useNotePanel();

  // Filter state for dropdown
  const [filter, setFilter] = useState('All');

  // Query client for cache invalidation after mutations
  const queryClient = useQueryClient();

  /**
   * Mutation for converting inbox item to a task
   * Uses POST /api/notes/:id/convert-to-task endpoint
   */
  const convertToTask = useMutation({
    mutationFn: async (noteId) => {
      return api.post(`/notes/${noteId}/convert-to-task`);
    },
    onSuccess: () => {
      // Refresh dashboard data after successful conversion
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Mutation for archiving inbox item (removes from inbox, keeps as note)
   * Sets isInbox to false to remove from inbox view
   */
  const archiveItem = useMutation({
    mutationFn: async (noteId) => {
      return api.put(`/notes/${noteId}`, { isInbox: false });
    },
    onSuccess: () => {
      // Refresh dashboard data after successful archive
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Mutation for permanently deleting an inbox item
   * Uses DELETE /api/notes/:id endpoint
   */
  const deleteItem = useMutation({
    mutationFn: async (noteId) => {
      return api.delete(`/notes/${noteId}`);
    },
    onSuccess: () => {
      // Refresh dashboard data after successful deletion
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Handle convert to task action
   * Stops event propagation to prevent opening the note panel
   */
  const handleConvertToTask = (e, noteId) => {
    e.stopPropagation();
    convertToTask.mutate(noteId);
  };

  /**
   * Handle archive action (keep as note, remove from inbox)
   * Stops event propagation to prevent opening the note panel
   */
  const handleArchive = (e, noteId) => {
    e.stopPropagation();
    archiveItem.mutate(noteId);
  };

  /**
   * Handle delete action (permanently remove)
   * Stops event propagation to prevent opening the note panel
   */
  const handleDelete = (e, noteId) => {
    e.stopPropagation();
    deleteItem.mutate(noteId);
  };

  /**
   * Handle filter change from dropdown
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Handle "Process All Items" button click
   * TODO: Implement batch processing logic
   */
  const handleProcessAll = () => {
    // TODO: Implement process all functionality
    // Could open a modal or process items one by one
    console.log('Process all items clicked');
  };

  // Filter items based on selected filter
  // TODO: Implement actual filtering logic when backend supports it
  const filteredItems = items;

  // Check if inbox is empty
  const isEmpty = filteredItems.length === 0;

  /**
   * Render a single inbox item with triage buttons
   */
  const renderInboxItem = (item) => (
    <div
      key={item._id}
      className="inbox-item"
      onClick={() => openNote(item._id)}
    >
      {/* Blue dot indicator */}
      <span className="inbox-dot"></span>

      {/* Item text (title or content preview) */}
      <span className="inbox-text">
        {item.title || item.content?.substring(0, 60) || 'Untitled'}
      </span>

      {/* Triage action buttons - visible on hover */}
      <div className="inbox-actions">
        <button
          className="triage-btn task"
          onClick={(e) => handleConvertToTask(e, item._id)}
          aria-label="Convert to task"
          title="Convert to task"
        >
          &rarr; Task
        </button>
        <button
          className="triage-btn note"
          onClick={(e) => handleArchive(e, item._id)}
          aria-label="Keep as note"
          title="Keep as note (remove from inbox)"
        >
          &rarr; Note
        </button>
        <button
          className="triage-btn delete"
          onClick={(e) => handleDelete(e, item._id)}
          aria-label="Delete item"
          title="Delete permanently"
        >
          &#128465;
        </button>
      </div>
    </div>
  );

  return (
    <section className="widget">
      {/* Widget Header with title and filter dropdown */}
      <div className="widget-header">
        <span className="widget-title">&#128229; Inbox</span>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
        >
          <option value="All">All</option>
          <option value="Unprocessed">Unprocessed</option>
          <option value="Recent">Recent</option>
        </select>
      </div>

      {/* Inbox header info showing item count */}
      <div className="inbox-header-info">
        <span className="inbox-count">{filteredItems.length}</span>
        <span className="inbox-label">items to process</span>
      </div>

      {/* Inbox items list or empty state */}
      {isEmpty ? (
        <div className="v2-empty-state">
          <p>Inbox zero!</p>
        </div>
      ) : (
        <>
          {/* Render up to 5 items */}
          {filteredItems.slice(0, 5).map(renderInboxItem)}

          {/* Process All button */}
          <button
            className="process-all-btn"
            onClick={handleProcessAll}
          >
            Process All Items
          </button>
        </>
      )}
    </section>
  );
}

// PropTypes for type checking
InboxWidgetV2.propTypes = {
  /** Array of inbox items to display */
  items: PropTypes.arrayOf(
    PropTypes.shape({
      /** Unique identifier for the item */
      _id: PropTypes.string.isRequired,
      /** Title of the inbox item */
      title: PropTypes.string,
      /** Content/body of the inbox item */
      content: PropTypes.string,
      /** Creation timestamp */
      createdAt: PropTypes.string,
    })
  ),
};

export default InboxWidgetV2;
