import { StickyNote, Pin, CheckSquare } from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All', icon: StickyNote },
  { id: 'pinned', label: 'Pinned', icon: Pin },
  { id: 'hasTasks', label: 'Has Tasks', icon: CheckSquare },
];

export default function NotesQuickLinks({ activeFilter, onFilterChange, counts = {} }) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
      {FILTERS.map(filter => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id];
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-bg'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {filter.label}
            {count != null && count > 0 && (
              <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
