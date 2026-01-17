import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  showToast as showToastAction,
  showSuccess as showSuccessAction,
  showError as showErrorAction,
  showWarning as showWarningAction,
  showUndoToast as showUndoToastAction,
} from '../store/toastSlice';

export function useToast() {
  const dispatch = useDispatch();

  const toast = useCallback(
    (message, options = {}) => {
      dispatch(showToastAction(message, options));
    },
    [dispatch]
  );

  const success = useCallback(
    (message, options = {}) => {
      dispatch(showSuccessAction(message, options));
    },
    [dispatch]
  );

  const error = useCallback(
    (message, options = {}) => {
      dispatch(showErrorAction(message, options));
    },
    [dispatch]
  );

  const warning = useCallback(
    (message, options = {}) => {
      dispatch(showWarningAction(message, options));
    },
    [dispatch]
  );

  const undo = useCallback(
    (message, onUndo, options = {}) => {
      dispatch(showUndoToastAction(message, onUndo, options));
    },
    [dispatch]
  );

  return {
    toast,
    success,
    error,
    warning,
    undo,
  };
}

export default useToast;
