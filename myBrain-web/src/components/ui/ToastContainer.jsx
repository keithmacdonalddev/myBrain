import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeToast } from '../../store/toastSlice';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Undo2
} from 'lucide-react';

function Toast({ toast, onRemove }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  const handleUndo = () => {
    if (toast.undoAction) {
      toast.undoAction();
    }
    onRemove();
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 bg-panel glass border border-border rounded-lg shadow-lg
        border-l-4 ${getBorderColor()}
        animate-slide-in
      `}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">{toast.message}</p>
        {toast.description && (
          <p className="text-xs text-muted mt-1">{toast.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {toast.undoAction && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-muted hover:text-text rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const dispatch = useDispatch();
  const { toasts } = useSelector((state) => state.toast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            toast={toast}
            onRemove={() => dispatch(removeToast(toast.id))}
          />
        </div>
      ))}
    </div>
  );
}
