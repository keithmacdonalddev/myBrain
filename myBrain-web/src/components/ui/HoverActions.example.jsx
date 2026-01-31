/**
 * HoverActions Usage Examples
 *
 * This file demonstrates various ways to use the HoverActions component
 * throughout the V2 dashboard widgets and other parts of the application.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import HoverActions from './HoverActions';
import { Edit, Trash, Archive, Check, X, ArrowRightCircle } from 'lucide-react';
import api from '../../lib/api';

// =============================================================================
// EXAMPLE 1: Basic Usage with Default Variant
// =============================================================================

function TaskItemExample() {
  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent parent click handlers
    console.log('Edit task');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    console.log('Delete task');
  };

  return (
    <div className="v2-task-item">
      <div className="v2-task-content">
        <span className="v2-task-title">Complete project documentation</span>
      </div>

      <HoverActions
        actions={[
          { icon: <Edit />, label: 'Edit', onClick: handleEdit, variant: 'default' },
          { icon: <Trash />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
        ]}
      />
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Primary Actions with Success Variant
// =============================================================================

function InboxItemExample() {
  const handleConvertToTask = (e) => {
    e.stopPropagation();
    console.log('Convert to task');
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    console.log('Archive item');
  };

  return (
    <div className="v2-inbox-item">
      <div className="v2-inbox-content">
        <span className="v2-inbox-title">Meeting notes from yesterday</span>
      </div>

      <HoverActions
        actions={[
          {
            icon: <ArrowRightCircle />,
            label: 'Convert to task',
            onClick: handleConvertToTask,
            variant: 'primary'
          },
          {
            icon: <Archive />,
            label: 'Archive',
            onClick: handleArchive,
            variant: 'default'
          },
        ]}
      />
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: Forced Visibility and Position Control
// =============================================================================

function NoteItemExample() {
  const [isSelected, setIsSelected] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    console.log('Delete note');
  };

  return (
    <div className="v2-note-item" onClick={() => setIsSelected(!isSelected)}>
      <div className="v2-note-content">
        <span className="v2-note-title">Important ideas</span>
      </div>

      {/* Force visible when item is selected, align to left */}
      <HoverActions
        visible={isSelected}
        position="left"
        actions={[
          {
            icon: <Trash />,
            label: 'Delete',
            onClick: handleDelete,
            variant: 'danger'
          },
        ]}
      />
    </div>
  );
}

// =============================================================================
// EXAMPLE 4: Multiple Actions with Different Variants
// =============================================================================

function EventItemExample() {
  const handleApprove = (e) => {
    e.stopPropagation();
    console.log('Approve event');
  };

  const handleReject = (e) => {
    e.stopPropagation();
    console.log('Reject event');
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    console.log('Edit event');
  };

  return (
    <div className="v2-event-item">
      <div className="v2-event-content">
        <span className="v2-event-title">Team standup</span>
      </div>

      <HoverActions
        actions={[
          {
            icon: <Check />,
            label: 'Approve',
            onClick: handleApprove,
            variant: 'success'
          },
          {
            icon: <Edit />,
            label: 'Edit',
            onClick: handleEdit,
            variant: 'default'
          },
          {
            icon: <X />,
            label: 'Reject',
            onClick: handleReject,
            variant: 'danger'
          },
        ]}
      />
    </div>
  );
}

// =============================================================================
// EXAMPLE 5: Conditional Actions with Disabled State
// =============================================================================

function ConditionalActionsExample({ canEdit, canDelete }) {
  const handleEdit = (e) => {
    e.stopPropagation();
    console.log('Edit');
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    console.log('Delete');
  };

  // Build actions array conditionally
  const actions = [
    {
      icon: <Edit />,
      label: 'Edit',
      onClick: handleEdit,
      variant: 'default',
      disabled: !canEdit
    },
    {
      icon: <Trash />,
      label: 'Delete',
      onClick: handleDelete,
      variant: 'danger',
      disabled: !canDelete
    },
  ];

  return (
    <div className="v2-task-item">
      <div className="v2-task-content">
        <span className="v2-task-title">Task with permissions</span>
      </div>

      <HoverActions actions={actions} />
    </div>
  );
}

// =============================================================================
// EXAMPLE 6: Integration with Mutations (TanStack Query)
// =============================================================================

function MutationExample({ item }) {
  const queryClient = useQueryClient();

  // Mutation for deleting item
  const deleteItem = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  // Mutation for archiving item
  const archiveItem = useMutation({
    mutationFn: async (id) => {
      return api.put(`/items/${id}`, { archived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['items']);
    },
  });

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteItem.mutate(item._id);
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    archiveItem.mutate(item._id);
  };

  return (
    <div className="v2-task-item">
      <div className="v2-task-content">
        <span className="v2-task-title">{item.title}</span>
      </div>

      <HoverActions
        actions={[
          {
            icon: <Archive />,
            label: 'Archive',
            onClick: handleArchive,
            variant: 'default',
            disabled: archiveItem.isPending
          },
          {
            icon: <Trash />,
            label: 'Delete',
            onClick: handleDelete,
            variant: 'danger',
            disabled: deleteItem.isPending
          },
        ]}
      />
    </div>
  );
}

// =============================================================================
// STYLING NOTES
// =============================================================================

/**
 * Parent Component CSS Requirements:
 *
 * For the hover reveal effect to work, the parent component needs:
 *
 * CSS:
 * ```css
 * .parent-item:hover .v2-hover-actions {
 *   opacity: 1;
 * }
 * ```
 *
 * The HoverActions component is hidden by default (opacity: 0)
 * and only becomes visible when:
 * 1. Parent element is hovered
 * 2. OR visible prop is set to true
 */

// =============================================================================
// ACCESSIBILITY NOTES
// =============================================================================

/**
 * Keyboard Navigation:
 * - All buttons are keyboard focusable (Tab key)
 * - Buttons have proper ARIA labels
 * - Focus states are clearly visible
 * - Type="button" prevents form submission
 *
 * Screen Readers:
 * - Action group has role="group" with aria-label
 * - Each button has aria-label matching the label prop
 * - Title attribute provides tooltip on hover
 */

export {
  TaskItemExample,
  InboxItemExample,
  NoteItemExample,
  EventItemExample,
  ConditionalActionsExample,
  MutationExample,
};
