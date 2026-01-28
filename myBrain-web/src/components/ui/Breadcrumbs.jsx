import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumbs - Navigation breadcrumb trail
 *
 * @param {Array} items - Array of { label, path? }
 *   Last item rendered as plain text, others as links
 */
export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            )}
            {isLast || !item.path ? (
              <span className={isLast ? 'font-medium text-text truncate max-w-[200px]' : 'text-muted'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-muted hover:text-primary transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
