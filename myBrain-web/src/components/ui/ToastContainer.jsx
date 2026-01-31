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

  const getIconColor = () => {
    switch (toast.type) {
      case 'success':
        return 'var(--success)';
      case 'error':
        return 'var(--danger)';
      case 'warning':
        return 'var(--warning)';
      default:
        return 'var(--primary)';
    }
  };

  const getIcon = () => {
    const iconStyle = { color: getIconColor() };
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" style={iconStyle} />;
      case 'error':
        return <AlertCircle className="w-5 h-5" style={iconStyle} />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" style={iconStyle} />;
      default:
        return <Info className="w-5 h-5" style={iconStyle} />;
    }
  };

  const getBorderStyle = () => {
    let color;
    switch (toast.type) {
      case 'success':
        color = 'var(--success)';
        break;
      case 'error':
        color = 'var(--danger)';
        break;
      case 'warning':
        color = 'var(--warning)';
        break;
      default:
        color = 'var(--primary)';
    }
    return { borderLeftColor: color };
  };

  return (
    <div
      className="flex items-start gap-3 p-4 bg-panel glass border border-border rounded-lg shadow-lg border-l-4 animate-slide-in"
      style={getBorderStyle()}
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
            aria-label="Undo"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-muted hover:text-text rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
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
