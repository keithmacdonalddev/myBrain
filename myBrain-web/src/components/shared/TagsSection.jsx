import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import TagInput from '../ui/TagInput';
import { usePopularTags } from '../../hooks/useTags';

/**
 * TagsSection - Shared component for managing tags with quick-select pills
 *
 * Features:
 * - Quick-select pills for popular tags (1-click addition) - always visible
 * - Full TagInput for search/create
 * - No expand/collapse - immediate access
 */
function TagsSection({
  tags = [],
  onChange,
  disabled = false,
  quickSelectLimit = 6,
  showQuickSelect = true
}) {
  // Fetch popular tags for quick-select
  const { data: popularData } = usePopularTags(quickSelectLimit);
  const popularTags = popularData?.tags || [];

  // Filter out already selected tags from quick-select
  const availableQuickTags = useMemo(() => {
    const selectedLower = tags.map(t => t.toLowerCase());
    return popularTags.filter(tag => !selectedLower.includes(tag.name.toLowerCase()));
  }, [popularTags, tags]);

  // Quick add a tag
  const handleQuickAdd = (tagName) => {
    const trimmed = tagName.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.map(t => t.toLowerCase()).includes(trimmed)) return;
    onChange([...tags, trimmed]);
  };

  if (disabled) return null;

  return (
    <div className="border-t border-border px-4 py-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs text-muted">
          {tags.length === 0 ? 'Tags' : `${tags.length} tag${tags.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Quick-select pills - always visible */}
      {showQuickSelect && availableQuickTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableQuickTags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              onClick={() => handleQuickAdd(tag.name)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-bg hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 rounded-lg text-xs text-muted transition-all"
              aria-label={`Add tag ${tag.name}`}
            >
              <span className="text-[10px] text-primary/60">+</span>
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Full TagInput for search/create */}
      <TagInput
        value={tags}
        onChange={onChange}
        placeholder="Search or create tags..."
        showPopular={false}
        popularLimit={0}
      />
    </div>
  );
}

export default TagsSection;
