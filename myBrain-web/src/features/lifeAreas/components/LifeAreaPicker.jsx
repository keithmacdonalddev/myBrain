import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Folder, X } from 'lucide-react';
import { useLifeAreas } from '../hooks/useLifeAreas';

export function LifeAreaPicker({ value, onChange, placeholder = 'Select category', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { data: lifeAreas = [], isLoading } = useLifeAreas();

  const selectedArea = lifeAreas.find((la) => la._id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lifeArea) => {
    onChange(lifeArea._id);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-sm hover:border-muted transition-colors"
      >
        {selectedArea ? (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedArea.color }}
            />
            <span className="text-text">{selectedArea.name}</span>
          </div>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <div className="flex items-center gap-1">
          {selectedArea && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-border rounded"
            >
              <X className="w-3 h-3 text-muted" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-50 max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted">Loading...</div>
          ) : lifeAreas.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">No categories found</div>
          ) : (
            lifeAreas.map((la) => (
              <button
                key={la._id}
                type="button"
                onClick={() => handleSelect(la)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg transition-colors ${
                  value === la._id ? 'bg-primary/10' : ''
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: la.color }}
                />
                <span className="text-text">{la.name}</span>
                {la.isDefault && (
                  <span className="ml-auto text-xs text-muted">(default)</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default LifeAreaPicker;
