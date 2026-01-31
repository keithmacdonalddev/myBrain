import { useState } from 'react';
import { Search, Filter, ChevronDown, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function TaskFilters({ filters, onFiltersChange }) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filters.status || filters.priority || filters.q;

  const clearFilters = () => {
    onFiltersChange({ q: '', status: '', priority: '' });
  };

  return (
    <div className="border-b border-v2-border-default">
      {/* Search and filter toggle row */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-v2-text-tertiary" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 bg-v2-bg-surface border border-v2-border-default rounded-lg text-sm focus:outline-none focus:border-v2-blue"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
            hasActiveFilters
              ? 'border-v2-blue bg-v2-blue/10 text-v2-blue'
              : 'border-v2-border-default hover:bg-v2-bg-secondary text-v2-text-tertiary'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-v2-bg-surface border border-v2-border-default rounded-lg text-sm focus:outline-none focus:border-v2-blue"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={filters.priority || ''}
            onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
            className="px-3 py-1.5 bg-v2-bg-surface border border-v2-border-default rounded-lg text-sm focus:outline-none focus:border-v2-blue"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1.5 text-sm text-v2-text-tertiary hover:text-v2-text-primary transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskFilters;
