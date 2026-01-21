import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { reportsApi } from '../../../lib/api';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Unwanted promotional content or mass messaging' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeted abuse' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Content promoting hatred against groups' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Offensive or adult content' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'privacy_violation', label: 'Privacy Violation', description: 'Sharing private information' },
  { value: 'scam', label: 'Scam', description: 'Fraudulent or deceptive behavior' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetType, // 'user' | 'message' | 'project' | 'task' | 'note' | 'file' | 'share'
  targetId,
  targetName, // Display name for the target
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitReport = useMutation({
    mutationFn: (data) => reportsApi.submitReport(data),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) return;

    submitReport.mutate({
      targetType,
      targetId,
      reason,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-panel border border-border rounded-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-text">
              Report {targetType === 'user' ? 'User' : 'Content'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-text mb-2">Report Submitted</h3>
            <p className="text-sm text-muted mb-4">
              Thank you for helping keep our community safe. We'll review your report and take appropriate action.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              {/* Target info */}
              {targetName && (
                <div className="p-3 bg-bg rounded-lg">
                  <p className="text-xs text-muted mb-1">Reporting</p>
                  <p className="text-sm font-medium text-text">{targetName}</p>
                </div>
              )}

              {/* Reason selection */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Why are you reporting this?
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        reason === r.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-text">{r.label}</p>
                        <p className="text-xs text-muted">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional details */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional context that might help us review this report..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-xs text-muted text-right mt-1">
                  {description.length}/1000
                </p>
              </div>

              {/* Error message */}
              {submitReport.error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitReport.error.message || 'Failed to submit report'}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || submitReport.isPending}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitReport.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
