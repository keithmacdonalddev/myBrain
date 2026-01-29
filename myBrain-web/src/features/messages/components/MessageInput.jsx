import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, File, Image, Loader2 } from 'lucide-react';
import { messagesApi } from '../../../lib/api';

function MessageInput({ onSend, onTyping, disabled = false, conversationId }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 2000);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !conversationId) return;

    setIsUploading(true);
    try {
      const { data } = await messagesApi.uploadAttachments(conversationId, files);
      setAttachments(prev => [...prev, ...data.attachments]);
    } catch (error) {
      console.error('Failed to upload attachments:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled || isUploading) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTyping?.(false);

    // Send message with attachments
    onSend(trimmedMessage, attachments);
    setMessage('');
    setAttachments([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border-t border-border p-3 bg-panel">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg"
            >
              {attachment.type === 'image' ? (
                <Image className="w-4 h-4 text-primary" />
              ) : (
                <File className="w-4 h-4 text-muted" />
              )}
              <span className="text-xs text-text truncate max-w-[120px]">
                {attachment.name}
              </span>
              <span className="text-xs text-muted">
                ({formatFileSize(attachment.size)})
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 p-0.5 text-muted hover:text-red-500 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !conversationId}
          className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors disabled:opacity-50"
          title="Attach file"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 bg-bg border border-border rounded-2xl text-sm resize-none focus:outline-none focus:border-primary disabled:opacity-50 max-h-[150px]"
          />
        </div>

        {/* Emoji button (placeholder) */}
        <button
          type="button"
          className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
          title="Emoji (coming soon)"
          disabled
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs text-muted mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

export default MessageInput;
