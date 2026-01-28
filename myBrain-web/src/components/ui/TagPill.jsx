import { Tag } from 'lucide-react';

/**
 * TagPill - Reusable tag pill/badge component
 *
 * @param {string} tag - Tag text to display
 * @param {'xs'|'sm'|'md'} size - Size variant (default: 'sm')
 * @param {function} onRemove - Optional callback to make the pill removable
 */
export default function TagPill({ tag, size = 'sm', onRemove }) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-medium ${sizeClasses[size]}`}>
      {tag}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(tag); }} className="hover:text-primary-hover">
          ×
        </button>
      )}
    </span>
  );
}
