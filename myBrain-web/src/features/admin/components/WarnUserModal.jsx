import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, AlertTriangle, Loader2, AlertCircle, FileText } from 'lucide-react';
import { adminApi } from '../../../lib/api';

export default function WarnUserModal({ user, onClose, onSubmit, isLoading, error }) {
  const [reason, setReason] = useState('');
  const [level, setLevel] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Fetch warning templates
  const { data: templatesData } = useQuery({
    queryKey: ['moderation-templates', 'warning'],
    queryFn: async () => {
      const response = await adminApi.getModerationTemplates({ actionType: 'warning' });
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
        if (template.warningLevel) {
          setLevel(template.warningLevel);
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

    onSubmit(reason.trim(), level);
  };

  const levels = [
    { value: 1, label: 'Minor', description: 'First offense, gentle reminder' },
    { value: 2, label: 'Moderate', description: 'Repeated behavior, formal warning' },
    { value: 3, label: 'Severe', description: 'Serious violation, final warning' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel glass-heavy border border-border rounded-lg shadow-theme-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Issue Warning</h2>
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
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name} (Level {template.warningLevel})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Warning level */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Warning Level</label>
            <div className="space-y-2">
              {levels.map(({ value, label, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    level === value
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-border hover:border-yellow-500/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    level === value ? 'bg-yellow-500 text-white' : 'bg-bg text-muted'
                  }`}>
                    {value}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${level === value ? 'text-yellow-500' : 'text-text'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-muted">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this warning is being issued..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
            />
          </div>

          {/* Current warning count */}
          {user.moderationStatus?.warningCount > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-500">
                This user already has {user.moderationStatus.warningCount} warning(s).
              </p>
            </div>
          )}

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
              className="flex-1 px-4 py-2 text-sm text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Issue Warning
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
