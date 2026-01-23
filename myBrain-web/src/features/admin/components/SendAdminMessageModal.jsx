import { useState } from 'react';
import { X, Mail, Loader2, AlertCircle, Send } from 'lucide-react';

export default function SendAdminMessageModal({ user, onClose, onSubmit, isLoading, error }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    onSubmit({
      subject: subject.trim(),
      message: message.trim(),
      category,
      priority
    });
  };

  const categories = [
    { value: 'general', label: 'General', description: 'General communication' },
    { value: 'support', label: 'Support', description: 'Support-related response' },
    { value: 'moderation', label: 'Moderation', description: 'Moderation-related notice' },
    { value: 'security', label: 'Security', description: 'Security alert or notice' },
    { value: 'billing', label: 'Billing', description: 'Billing or subscription related' },
    { value: 'announcement', label: 'Announcement', description: 'Platform announcement' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-muted' },
    { value: 'normal', label: 'Normal', color: 'text-blue-500' },
    { value: 'high', label: 'High', color: 'text-yellow-500' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-500' }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel glass-heavy border border-border rounded-lg shadow-theme-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-panel">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Mail className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Send Message</h2>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
              placeholder="Message subject..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {categories.map(({ value, label, description }) => (
                <option key={value} value={value}>
                  {label} - {description}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Priority</label>
            <div className="flex gap-2">
              {priorities.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                    priority === value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                      : `border-border hover:border-blue-500/50 ${color}`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              maxLength={5000}
              placeholder="Write your message to the user..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
            <p className="text-xs text-muted mt-1">
              {message.length}/5000 characters
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-500">
              This message will be sent directly to the user and they will receive a notification.
              The message will be stored and visible in their admin message history.
            </p>
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
              disabled={isLoading || !subject.trim() || !message.trim()}
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
