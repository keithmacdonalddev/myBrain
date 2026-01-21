import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for auto-save functionality with debouncing and retry logic
 * Used across slide panels for notes, tasks, projects, etc.
 *
 * @param {Object} options
 * @param {string} options.id - ID of the item being edited (null for new items)
 * @param {Object} options.currentData - Current form data
 * @param {Function} options.onSave - Async function to save data
 * @param {boolean} options.isOpen - Whether the panel is open
 * @param {number} options.debounceMs - Debounce delay in ms (default: 1500)
 * @param {number} options.retryMs - Retry delay on error in ms (default: 5000)
 * @param {Function} options.hasChanges - Function to compare currentData with lastSaved
 *
 * @returns {Object} { saveStatus, lastSaved, triggerSave, resetSaveState }
 */
export default function useAutoSave({
  id,
  currentData,
  onSave,
  isOpen,
  debounceMs = 1500,
  retryMs = 5000,
  hasChanges: hasChangesFn,
}) {
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);

  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSavedRef = useRef(currentData);
  const isNewItem = !id;

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (hasChangesFn) {
      return hasChangesFn(currentData, lastSavedRef.current);
    }
    // Default deep comparison using JSON (works for simple objects)
    return JSON.stringify(currentData) !== JSON.stringify(lastSavedRef.current);
  }, [currentData, hasChangesFn]);

  // Core save function
  const save = useCallback(async () => {
    if (!id || isNewItem) return;

    if (!hasChanges()) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    try {
      await onSave(currentData);
      lastSavedRef.current = { ...currentData };
      setSaveStatus('saved');
      setLastSaved(new Date());

      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('error');

      // Schedule retry
      retryTimeoutRef.current = setTimeout(() => {
        save();
      }, retryMs);
    }
  }, [id, isNewItem, currentData, onSave, hasChanges, retryMs]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!id || !isOpen || isNewItem) return;

    if (hasChanges()) {
      setSaveStatus('unsaved');

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule save
      saveTimeoutRef.current = setTimeout(() => {
        save();
      }, debounceMs);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentData, id, isOpen, isNewItem, hasChanges, save, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Save on panel close if there are unsaved changes
  useEffect(() => {
    if (!isOpen && saveStatus === 'unsaved') {
      save();
    }
  }, [isOpen, saveStatus, save]);

  // Trigger immediate save (for Ctrl+S)
  const triggerSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    save();
  }, [save]);

  // Reset save state (for when loading new data)
  const resetSaveState = useCallback((initialData) => {
    lastSavedRef.current = initialData ? { ...initialData } : {};
    setSaveStatus('saved');
  }, []);

  // Update lastSavedRef when data is loaded
  const setLastSavedData = useCallback((data) => {
    lastSavedRef.current = data ? { ...data } : {};
  }, []);

  return {
    saveStatus,
    lastSaved,
    triggerSave,
    resetSaveState,
    setLastSavedData,
    setSaveStatus,
    setLastSaved,
  };
}

/**
 * Helper function to compare arrays (for tags, etc.)
 */
export function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Helper to create a change detection function for specific fields
 * @param {string[]} fields - Array of field names to compare
 */
export function createChangeDetector(fields) {
  return (current, lastSaved) => {
    return fields.some(field => {
      const currentVal = current[field];
      const savedVal = lastSaved[field];

      // Handle arrays
      if (Array.isArray(currentVal) || Array.isArray(savedVal)) {
        return !arraysEqual(currentVal, savedVal);
      }

      return currentVal !== savedVal;
    });
  };
}
