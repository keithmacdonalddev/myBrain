import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * TagInput component with autocomplete suggestions
 *
 * @param {Object} props
 * @param {string[]} props.suggestions - Array of existing tags to suggest
 * @param {string[]} props.currentTags - Currently selected tags (to filter out from suggestions)
 * @param {Function} props.onAdd - Callback when a tag is added
 * @param {Function} props.onClose - Callback when input should close
 */
function TagInput({ suggestions = [], currentTags = [], onAdd, onClose }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filter suggestions based on input and current tags
  const filteredSuggestions = suggestions.filter(
    (tag) =>
      !currentTags.includes(tag) &&
      tag.toLowerCase().includes(input.toLowerCase())
  );

  // Show suggestions when input is focused and there are matches
  const visibleSuggestions = showSuggestions && input.length > 0 ? filteredSuggestions.slice(0, 8) : [];

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [input]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleSubmit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [input]);

  const handleSubmit = () => {
    const newTag = input.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      onAdd(newTag);
    }
    setInput('');
    setShowSuggestions(false);
    onClose?.();
  };

  const handleSelectSuggestion = (tag) => {
    if (!currentTags.includes(tag)) {
      onAdd(tag);
    }
    setInput('');
    setShowSuggestions(false);
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (visibleSuggestions.length > 0 && highlightedIndex >= 0) {
        handleSelectSuggestion(visibleSuggestions[highlightedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setInput('');
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < visibleSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Tab' && visibleSuggestions.length > 0) {
      e.preventDefault();
      handleSelectSuggestion(visibleSuggestions[highlightedIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder="Tag name..."
        autoFocus
        className="px-2 py-0.5 bg-bg border border-border rounded text-xs focus:outline-none focus:border-primary w-28"
      />

      {/* Suggestions dropdown */}
      {visibleSuggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-panel border border-border rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-auto">
          {visibleSuggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSelectSuggestion(tag)}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                index === highlightedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-bg'
              }`}
            >
              {tag}
            </button>
          ))}
          {input.trim() && !suggestions.includes(input.trim().toLowerCase()) && (
            <div className="px-3 py-1.5 text-xs text-muted border-t border-border">
              Press Enter to create "{input.trim()}"
            </div>
          )}
        </div>
      )}

      {/* Show create hint if no matching suggestions */}
      {showSuggestions && input.length > 0 && visibleSuggestions.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-panel border border-border rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-1.5 text-xs text-muted">
            Press Enter to create "{input.trim()}"
          </div>
        </div>
      )}
    </div>
  );
}

export default TagInput;
