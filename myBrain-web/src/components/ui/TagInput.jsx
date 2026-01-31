import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Tag as TagIcon, TrendingUp, Search } from 'lucide-react';
import { usePopularTags, useSearchTags } from '../../hooks/useTags';

/**
 * TagInput - A component for managing tags with autocomplete and popular tag suggestions
 *
 * Features:
 * - Shows popular tags (sorted by usage) for quick 1-click addition
 * - Autocomplete search when typing
 * - Create new tags inline
 * - Remove tags with X button
 */
function TagInput({
  value = [],
  onChange,
  placeholder = 'Add tag...',
  maxTags = 10,
  showPopular = true,
  popularLimit = 8,
  className = '',
}) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch popular tags
  const { data: popularData } = usePopularTags(popularLimit);
  const popularTags = popularData?.tags || [];

  // Search tags as user types
  const { data: searchData } = useSearchTags(inputValue, {
    enabled: inputValue.length >= 1,
  });
  const searchResults = searchData?.tags || [];

  // Filter out already selected tags from suggestions
  const availablePopularTags = useMemo(() => {
    const selectedLower = value.map(t => t.toLowerCase());
    return popularTags.filter(tag => !selectedLower.includes(tag.name.toLowerCase()));
  }, [popularTags, value]);

  const availableSearchResults = useMemo(() => {
    const selectedLower = value.map(t => t.toLowerCase());
    return searchResults.filter(tag => !selectedLower.includes(tag.name.toLowerCase()));
  }, [searchResults, value]);

  // Check if input matches an existing tag
  const inputMatchesExisting = useMemo(() => {
    const inputLower = inputValue.trim().toLowerCase();
    return searchResults.some(tag => tag.name.toLowerCase() === inputLower) ||
           popularTags.some(tag => tag.name.toLowerCase() === inputLower);
  }, [inputValue, searchResults, popularTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagName) => {
    const trimmed = tagName.trim().toLowerCase();
    if (!trimmed) return;
    if (value.length >= maxTags) return;
    if (value.map(t => t.toLowerCase()).includes(trimmed)) return;

    onChange([...value, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    // Remove commas and add tag if present
    if (newValue.includes(',')) {
      const parts = newValue.split(',');
      if (parts[0].trim()) {
        addTag(parts[0]);
      }
      return;
    }
    setInputValue(newValue);
    setShowDropdown(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Tags + Input */}
      <div
        className={`flex flex-wrap gap-2 p-2 bg-bg border rounded-xl transition-colors min-h-[42px] ${
          isFocused ? 'border-primary ring-2 ring-primary/20' : 'border-border'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected Tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-sm rounded-lg"
          >
            <TagIcon className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 p-0.5 hover:bg-primary/20 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setShowDropdown(true);
            }}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] px-1 py-1 bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
          />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && isFocused && (
        <div className="absolute z-50 w-full mt-2 bg-panel glass border border-border rounded-xl shadow-theme-floating overflow-hidden max-h-[280px] overflow-y-auto">
          {/* Search Results */}
          {inputValue && availableSearchResults.length > 0 && (
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted uppercase tracking-wide">
                <Search className="w-3 h-3" />
                Matching Tags
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availableSearchResults.slice(0, 5).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => addTag(tag.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg hover:bg-primary/10 hover:text-primary border border-border rounded-lg text-sm text-text transition-colors min-h-[44px]"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag.name}
                    <span className="text-xs text-muted">({tag.usageCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag Option */}
          {inputValue.trim() && !inputMatchesExisting && (
            <div className="p-2 border-b border-border">
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/10 rounded-lg text-sm text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create "{inputValue.trim()}"
              </button>
            </div>
          )}

          {/* Popular Tags */}
          {showPopular && availablePopularTags.length > 0 && !inputValue && (
            <div className="p-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted uppercase tracking-wide">
                <TrendingUp className="w-3 h-3" />
                Popular Tags
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {availablePopularTags.map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => addTag(tag.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg hover:bg-primary/10 hover:text-primary border border-border rounded-lg text-sm text-text transition-colors"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag.name}
                    <span className="text-xs text-muted">({tag.usageCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!inputValue && availablePopularTags.length === 0 && (
            <div className="p-4 text-center text-sm text-muted">
              <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tags yet. Start typing to create one.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TagInput;
