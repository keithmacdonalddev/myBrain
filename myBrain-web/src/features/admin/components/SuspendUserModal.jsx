import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Ban, Loader2, AlertCircle, Calendar, FileText } from 'lucide-react';
import { adminApi } from '../../../lib/api';

export default function SuspendUserModal({ user, onClose, onSubmit, isLoading, error }) {
  const [reason, setReason] = useState('');
  const [durationType, setDurationType] = useState('temporary');
  const [endDate, setEndDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Fetch suspension templates
  const { data: templatesData } = useQuery({
    queryKey: ['moderation-templates', 'suspension'],
    queryFn: async () => {
      const response = await adminApi.getModerationTemplates({ actionType: 'suspension' });
      return response.data;
    },
  });

  const templates = templatesData?.templates || [];

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t._id === selectedTemplate);
      if (template) {
        setReason(template.reason);
        if (template.suspensionDays) {
          const date = new Date();
          date.setDate(date.getDate() + template.suspensionDays);
          setEndDate(date.toISOString().split('T')[0]);
          setDurationType('temporary');
        } else {
          setDurationType('permanent');
          setEndDate('');
        }
      }
    }
  }, [selectedTemplate, templates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    // Track template usage if one was selected
    if (selectedTemplate) {
      adminApi.useModerationTemplate(selectedTemplate).catch(() => {});
    }

    const until = durationType === 'permanent' ? null : endDate || null;
    onSubmit(reason.trim(), until);
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Quick duration options
  const quickDurations = [
    { label: '1 day', days: 1 },
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
  ];

  const setQuickDuration = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setEndDate(date.toISOString().split('T')[0]);
    setDurationType('temporary');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel glass-heavy border border-border rounded-lg shadow-theme-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Ban className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Suspend User</h2>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Use Template (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.suspensionDays ? `${template.suspensionDays} days` : 'Permanent'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Duration type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Suspension Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationType('temporary')}
                className={`p-3 rounded-lg border transition-colors ${
                  durationType === 'temporary'
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-border hover:border-red-500/50 text-muted'
                }`}
              >
                <Calendar className="w-4 h-4 mx-auto mb-1" />
                <p className="text-xs font-medium">Temporary</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDurationType('permanent');
                  setEndDate('');
                }}
                className={`p-3 rounded-lg border transition-colors ${
                  durationType === 'permanent'
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-border hover:border-red-500/50 text-muted'
                }`}
              >
                <Ban className="w-4 h-4 mx-auto mb-1" />
                <p className="text-xs font-medium">Permanent</p>
              </button>
            </div>
          </div>

          {/* End date for temporary */}
          {durationType === 'temporary' && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">End Date</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {quickDurations.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setQuickDuration(days)}
                    className="px-2 py-1 text-xs border border-border rounded hover:border-red-500/50 hover:text-red-500 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={minDate}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              {!endDate && (
                <p className="text-xs text-muted mt-1">
                  If no end date is set, the suspension will be indefinite.
                </p>
              )}
            </div>
          )}

          {durationType === 'permanent' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-500">
                Permanent suspensions require manual removal. The user will not be able to access their account until an admin lifts the suspension.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this user is being suspended..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Suspend User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
