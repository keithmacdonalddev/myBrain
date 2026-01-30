import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useModalShortcuts } from '../../hooks/useKeyboardShortcuts';

/**
 * Base Modal Component
 * Provides consistent modal structure with header, body, and footer
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal body content
 * @param {string} props.size - Modal size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
 * @param {boolean} props.showFooter - Whether to show footer (default: true)
 * @param {Function} props.onSubmit - Submit handler (optional)
 * @param {string} props.submitText - Submit button text (default: 'Save')
 * @param {string} props.cancelText - Cancel button text (default: 'Cancel')
 * @param {boolean} props.isLoading - Loading state for submit button
 * @param {boolean} props.submitDisabled - Disable submit button
 * @param {string} props.variant - Button variant: 'primary' | 'danger'
 * @param {React.ReactNode} props.footerLeft - Content for left side of footer
 * @param {React.ReactNode} props.customFooter - Completely custom footer (replaces default)
 * @param {string} props.className - Additional classes for modal container
 * @param {boolean} props.mobileFullscreen - Use fullscreen on mobile (default: false)
 * @param {boolean} props.closeOnBackdrop - Close on backdrop click (default: true)
 * @param {boolean} props.showCloseButton - Show close X button (default: true)
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showFooter = true,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  isLoading = false,
  submitDisabled = false,
  variant = 'primary',
  footerLeft,
  customFooter,
  className = '',
  mobileFullscreen = false,
  closeOnBackdrop = true,
  showCloseButton = true,
}) {
  const modalRef = useRef(null);

  // Keyboard shortcuts (Escape to close)
  useModalShortcuts({
    isOpen,
    onClose,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap - handles Tab key cycling within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Focus first element on mount
    const focusableElements = modal.querySelectorAll(focusableSelector);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus within modal
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = modal.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      // Shift+Tab from first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab from last element -> go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover active:bg-primary-hover/80 text-white',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (onSubmit && !isLoading && !submitDisabled) {
      onSubmit(e);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        mobileFullscreen
          ? 'items-end sm:items-center justify-center p-0 sm:p-4'
          : 'items-center justify-center p-4'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-panel glass-heavy ${
          mobileFullscreen
            ? 'border-t sm:border border-border rounded-t-2xl sm:rounded-lg'
            : 'border border-border rounded-lg'
        } ${
          mobileFullscreen ? 'max-h-[95vh] sm:max-h-[90vh]' : 'max-h-[90vh]'
        } overflow-hidden flex flex-col shadow-2xl ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-text">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-bg active:bg-bg/80 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* Footer */}
        {showFooter && (
          customFooter ? (
            <div className="p-4 border-t border-border flex-shrink-0">
              {customFooter}
            </div>
          ) : (
            <div className="p-4 border-t border-border flex flex-col sm:flex-row gap-2 flex-shrink-0">
              {footerLeft && (
                <div className="order-last sm:order-first">
                  {footerLeft}
                </div>
              )}
              <div className="flex-1 hidden sm:block" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-3 text-sm text-muted border border-border rounded-lg hover:bg-bg active:bg-bg/80 transition-colors min-h-[48px]"
                >
                  {cancelText}
                </button>
                {onSubmit && (
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isLoading || submitDisabled}
                    className={`flex-1 sm:flex-initial px-6 py-3 text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] ${variantClasses[variant]}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      submitText
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Simple confirmation modal using BaseModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler
 * @param {string} props.title - Modal title
 * @param {string|React.ReactNode} props.message - Confirmation message
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {string} props.variant - Button variant: 'primary' | 'danger'
 * @param {boolean} props.isLoading - Loading state
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      onSubmit={onConfirm}
      submitText={confirmText}
      cancelText={cancelText}
      variant={variant}
      isLoading={isLoading}
    >
      <p className="text-text">{message}</p>
    </BaseModal>
  );
}

/**
 * Form modal with standardized form handling
 *
 * @param {Object} props - Same as BaseModal plus:
 * @param {Function} props.onSubmit - Form submit handler (receives event)
 * @param {React.ReactNode} props.error - Error message to display
 */
export function FormModal({
  children,
  onSubmit,
  error,
  ...modalProps
}) {
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <BaseModal {...modalProps} onSubmit={handleFormSubmit}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {children}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
            <span>{error}</span>
          </div>
        )}
      </form>
    </BaseModal>
  );
}
