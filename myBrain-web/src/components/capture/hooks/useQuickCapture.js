/**
 * =============================================================================
 * USEQUICKCAPTURE HOOK - Shared Quick Capture Logic
 * =============================================================================
 *
 * Provides shared state and mutation logic for quick capture functionality.
 * Used by both QuickCaptureModal and DashboardCards QuickCapture components.
 *
 * Features:
 * - Content and type state management
 * - Submit function that handles notes and tasks
 * - Smart parsing option for title extraction
 * - Success callbacks and auto-reset
 */

import { useState, useCallback, useMemo } from 'react';
import { useCreateNote } from '../../../features/notes/hooks/useNotes';
import { useCreateTask } from '../../../features/tasks/hooks/useTasks';
import useToast from '../../../hooks/useToast';

/**
 * Hook for quick capture functionality
 *
 * @param {Object} options - Configuration options
 * @param {string} options.defaultType - Default item type ('note' or 'task')
 * @param {Function} options.onSuccess - Callback after successful creation
 * @param {boolean} options.autoReset - Whether to clear content after success
 * @param {boolean} options.smartParsing - Whether to extract title from first line
 * @param {Object} options.messages - Custom success/error messages
 * @returns {Object} Quick capture state and methods
 */
export function useQuickCapture(options = {}) {
  const {
    defaultType = 'note',
    onSuccess,
    autoReset = true,
    smartParsing = false,
    messages = {},
  } = options;

  // Default messages - can be overridden via options.messages (memoized for stability)
  const successMessages = useMemo(() => ({
    note: messages.noteSuccess || 'Added to inbox',
    task: messages.taskSuccess || 'Task created',
  }), [messages.noteSuccess, messages.taskSuccess]);

  const errorMessages = useMemo(() => ({
    note: messages.noteError || 'Failed to create note',
    task: messages.taskError || 'Failed to create task',
  }), [messages.noteError, messages.taskError]);

  // Local state for content and type
  const [content, setContent] = useState('');
  const [type, setType] = useState(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations for creating notes and tasks
  const createNote = useCreateNote();
  const createTask = useCreateTask();
  const toast = useToast();

  /**
   * Parse content to extract title and body
   * If smartParsing is enabled and first line is short with body content,
   * uses first line as title
   */
  const parseContent = useCallback((rawContent) => {
    if (!smartParsing) {
      return { title: rawContent.trim(), body: '' };
    }

    const lines = rawContent.split('\n');
    const firstLine = lines[0].trim();
    const restLines = lines.slice(1).join('\n').trim();

    // If first line is short (under 80 chars) and there's more content, use as title
    if (firstLine.length < 80 && restLines.length > 0) {
      return { title: firstLine, body: restLines };
    }

    return { title: '', body: rawContent.trim() };
  }, [smartParsing]);

  /**
   * Submit the captured content
   * Creates either a note or task based on current type
   */
  const submit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return null;

    setIsSubmitting(true);
    try {
      const { title, body } = parseContent(content);

      if (type === 'note') {
        // Create note - use title or truncated body as title
        const result = await createNote.mutateAsync({
          title: title || body.slice(0, 100),
          body: title ? body : '',
          processed: false, // Goes to inbox
        });
        toast.success(successMessages.note);
        if (autoReset) setContent('');
        onSuccess?.({ type: 'note', data: result.data.note });
        return result.data.note;
      } else {
        // Create task - use title or truncated body as title
        const result = await createTask.mutateAsync({
          title: title || body.slice(0, 100),
          body: title ? body : '',
        });
        toast.success(successMessages.task);
        if (autoReset) setContent('');
        onSuccess?.({ type: 'task', data: result.data.task });
        return result.data.task;
      }
    } catch (error) {
      toast.error(errorMessages[type]);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [content, type, isSubmitting, parseContent, createNote, createTask, toast, onSuccess, autoReset, successMessages, errorMessages]);

  /**
   * Reset content and type to defaults
   */
  const reset = useCallback(() => {
    setContent('');
    setType(defaultType);
  }, [defaultType]);

  return {
    // State
    content,
    setContent,
    type,
    setType,
    isSubmitting,

    // Actions
    submit,
    reset,

    // Computed
    isValid: content.trim().length > 0,
  };
}
