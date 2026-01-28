import { Pin, Lightbulb } from 'lucide-react';

export default function NotesCompactList({ notes = [], selectedId, onSelectNote }) {
  return (
    <div className="divide-y divide-border">
      {notes.map(note => {
        const isSelected = note._id === selectedId;
        return (
          <button
            key={note._id}
            onClick={() => onSelectNote(note._id)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              isSelected
                ? 'bg-primary/10 border-l-2 border-l-primary'
                : 'hover:bg-panel border-l-2 border-l-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {note.pinned && <Pin className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-text'}`}>
                {note.title || 'Untitled note'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {note.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        );
      })}
      {notes.length === 0 && (
        <div className="text-center py-8 text-sm text-muted">No notes found</div>
      )}
    </div>
  );
}
