import { useState } from 'react';
import { Link2, ChevronDown, ChevronUp, StickyNote, CheckSquare, Loader2 } from 'lucide-react';

function BacklinksPanel({ backlinks, isLoading, onNoteClick, onTaskClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const backlinkCount = backlinks?.length || 0;

  // Group backlinks by source type
  const noteBacklinks = backlinks?.filter(l => l.sourceType === 'note') || [];
  const taskBacklinks = backlinks?.filter(l => l.sourceType === 'task') || [];

  if (isLoading) {
    return (
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs">Loading backlinks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-bg/50 transition-colors"
        aria-label={isExpanded ? "Collapse backlinks" : "Expand backlinks"}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs text-muted">
            {backlinkCount === 0
              ? 'No backlinks'
              : `${backlinkCount} backlink${backlinkCount === 1 ? '' : 's'}`}
          </span>
        </div>
        {backlinkCount > 0 && (
          isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          )
        )}
      </button>

      {isExpanded && backlinkCount > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {/* Note backlinks */}
          {noteBacklinks.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Notes</p>
              <div className="space-y-1">
                {noteBacklinks.map((link) => (
                  <button
                    key={link._id}
                    onClick={() => onNoteClick?.(link.sourceId)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-bg transition-colors"
                    aria-label={`Open note ${link.source?.title || 'Untitled Note'}`}
                  >
                    <StickyNote className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                    <span className="text-xs text-text truncate">
                      {link.source?.title || 'Untitled Note'}
                    </span>
                    {link.linkType && link.linkType !== 'reference' && (
                      <span className="text-[10px] text-muted/70 ml-auto">
                        {link.linkType.replace('_', ' ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task backlinks */}
          {taskBacklinks.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Tasks</p>
              <div className="space-y-1">
                {taskBacklinks.map((link) => (
                  <button
                    key={link._id}
                    onClick={() => onTaskClick?.(link.sourceId)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-bg transition-colors"
                    aria-label={`Open task ${link.source?.title || 'Untitled Task'}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                    <span className="text-xs text-text truncate">
                      {link.source?.title || 'Untitled Task'}
                    </span>
                    {link.linkType && link.linkType !== 'reference' && (
                      <span className="text-[10px] text-muted/70 ml-auto">
                        {link.linkType.replace('_', ' ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BacklinksPanel;
