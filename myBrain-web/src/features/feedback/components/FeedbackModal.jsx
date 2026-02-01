import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import BaseModal from '../../../components/ui/BaseModal';
import { useMetadataCapture } from '../hooks/useMetadataCapture';

/**
 * FeedbackModal Component
 *
 * Modal for collecting user feedback with support for:
 * - Feedback type selection (Bug, Feature Request, General, Question)
 * - Title and description fields
 * - Opt-in for status updates
 * - Opt-in for diagnostic metadata capture
 * - Form validation with inline error messages
 * - Loading state during submission
 * - Success message after submission
 * - Spam protection via timestamp tracking
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Close handler callback
 * @param {Function} props.onSubmitSuccess - Callback after successful submission (optional)
 */
export default function FeedbackModal({ isOpen, onClose, onSubmitSuccess }) {
  // Form state
  const [feedbackType, setFeedbackType] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wantsUpdates, setWantsUpdates] = useState(true);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [honeypot, setHoneypot] = useState('');

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formOpenedAt, setFormOpenedAt] = useState(null);

  // Use metadata capture hook
  const { captureMetadata } = useMetadataCapture();

  // Initialize form timestamp on modal open
  useEffect(() => {
    if (isOpen && !formOpenedAt) {
      setFormOpenedAt(new Date());
    }
  }, [isOpen, formOpenedAt]);

  // Update includeDiagnostics when feedbackType changes (true for bugs, false otherwise)
  useEffect(() => {
    setIncludeDiagnostics(feedbackType === 'bug');
  }, [feedbackType]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setFeedbackType('general');
        setWantsUpdates(true);
        setIncludeDiagnostics(true);
        setHoneypot('');
        setErrors({});
        setIsSubmitting(false);
        setShowSuccess(false);
        setFormOpenedAt(null);
      }, 300); // Wait for modal close animation
    }
  }, [isOpen]);

  /**
   * Validate form fields
   * Returns error object (empty if valid)
   */
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (description && description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    return newErrors;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare feedback payload
      // Note: wantsUpdates is sent at top level - route constructs submittedBy object
      const payload = {
        type: feedbackType,
        title: title.trim(),
        description: description.trim() || undefined,
        wantsUpdates,
        includeDiagnostics,
        metadata: includeDiagnostics ? captureMetadata() : undefined,
        formOpenedAt: formOpenedAt?.toISOString(),
        honeypot, // Backend will silently reject if filled
      };

      // Submit to API
      const response = await fetch('/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to submit feedback');
      }

      // Show success state
      setShowSuccess(true);

      // Auto-close after 2 seconds and trigger callback
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
        onClose();
      }, 2000);
    } catch (error) {
      // Show error message
      setErrors({
        submit: error.message || 'An error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success state with confirmation message
  if (showSuccess) {
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title="Feedback Submitted"
        size="sm"
        showFooter={false}
      >
        <div className="text-center py-8">
          <CheckCircle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: `var(--success)` }}
          />
          <h3 className="text-lg font-semibold text-text mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-muted mb-4">
            We appreciate your help improving myBrain.
          </p>
          {wantsUpdates && (
            <p className="text-sm text-text">
              You'll receive updates when we address this feedback.
            </p>
          )}
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Your Feedback"
      size="md"
      mobileFullscreen={true}
      onSubmit={handleSubmit}
      submitText="Submit Feedback"
      isLoading={isSubmitting}
      submitDisabled={isSubmitting}
    >
      <form className="space-y-5">
        {/* Honeypot field for spam protection - hidden from humans */}
        <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Error summary */}
        {errors.submit && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: `rgba(var(--danger-rgb, 239, 68, 68), 0.1)`,
              color: `var(--danger)`,
              border: `1px solid var(--danger)`,
            }}
          >
            {errors.submit}
          </div>
        )}

        {/* Feedback Type Selector */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">
            What type of feedback?
          </label>
          <div
            className="space-y-2 p-3 rounded-lg"
            style={{
              backgroundColor: `var(--bg)`,
              border: `1px solid var(--border)`,
            }}
          >
            {[
              { value: 'bug', label: 'Bug Report', description: 'Something is broken' },
              { value: 'feature_request', label: 'Feature Request', description: 'Suggest something new' },
              { value: 'general', label: 'General Feedback', description: 'Comments or suggestions' },
              { value: 'question', label: 'Question', description: 'I need help understanding' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-panel transition-colors"
              >
                <input
                  type="radio"
                  name="feedbackType"
                  value={option.value}
                  checked={feedbackType === option.value}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-4 h-4"
                  style={{
                    accentColor: `var(--primary)`,
                  }}
                />
                <div>
                  <div className="text-sm font-medium text-text">
                    {option.label}
                  </div>
                  <div className="text-xs text-muted">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Title Field */}
        <div>
          <label
            htmlFor="feedback-title"
            className="block text-sm font-medium text-text mb-1"
          >
            Title <span style={{ color: `var(--danger)` }}>*</span>
          </label>
          <input
            id="feedback-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors({ ...errors, title: '' });
              }
            }}
            placeholder="Brief description of your feedback"
            maxLength={100}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-panel text-text placeholder-muted transition-colors focus:outline-none focus:ring-2"
            style={{
              borderColor: errors.title ? `var(--danger)` : `var(--border)`,
              '--tw-ring-color': `var(--primary)`,
            }}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-start mt-1">
            {errors.title && (
              <span className="text-xs" style={{ color: `var(--danger)` }}>
                {errors.title}
              </span>
            )}
            <span
              className="text-xs ml-auto"
              style={{
                color: title.length > 80 ? `var(--warning)` : `var(--muted)`,
              }}
            >
              {title.length}/100
            </span>
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="feedback-description"
            className="block text-sm font-medium text-text mb-1"
          >
            Details <span className="text-muted text-xs">(optional)</span>
          </label>
          <textarea
            id="feedback-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors({ ...errors, description: '' });
              }
            }}
            placeholder="Tell us more... What were you trying to do? What happened? What did you expect?"
            maxLength={2000}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-panel text-text placeholder-muted resize-none transition-colors focus:outline-none focus:ring-2"
            style={{
              borderColor: errors.description ? `var(--danger)` : `var(--border)`,
              '--tw-ring-color': `var(--primary)`,
            }}
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-start mt-1">
            {errors.description && (
              <span className="text-xs" style={{ color: `var(--danger)` }}>
                {errors.description}
              </span>
            )}
            <span
              className="text-xs ml-auto"
              style={{
                color: description.length > 1800 ? `var(--warning)` : `var(--muted)`,
              }}
            >
              {description.length}/2000
            </span>
          </div>
        </div>

        {/* Updates Checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wantsUpdates}
              onChange={(e) => setWantsUpdates(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{
                accentColor: `var(--primary)`,
              }}
              disabled={isSubmitting}
            />
            <span className="text-sm text-text">
              I'd like to receive updates about this feedback
            </span>
          </label>
        </div>

        {/* Diagnostics Checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDiagnostics}
              onChange={(e) => setIncludeDiagnostics(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: `var(--primary)` }}
              disabled={isSubmitting}
            />
            <span className="text-sm text-text">
              Include diagnostic info (helps us fix issues faster)
            </span>
          </label>
          <p className="text-xs text-muted mt-1 ml-6">
            Browser, page URL, and recent errors (no personal data)
          </p>
        </div>
      </form>
    </BaseModal>
  );
}
