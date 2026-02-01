/**
 * RadarView - Full-screen radar overlay showing tasks, events, and notes as blips
 *
 * Phase 1: Layout + styling (topbar, bottombar, proper visual design)
 * Phase 2: Controls and interactivity (sweep, pulse, grid, blip size, labels, glow toggles)
 * Phase 3: Side panel for blip details (click blip to open, ESC to close, toggle behavior)
 * Phase 4: Quick Capture + Sector keyboard shortcuts (T/E/P/N keys, center click)
 *
 * This component displays a radar visualization where items are positioned
 * based on their urgency/time:
 * - Innermost ring: Items due within 1 hour (NOW)
 * - Middle ring: Items due today (TODAY)
 * - Outer ring: Items due this week (THIS WEEK)
 *
 * Blip colors by type:
 * - Tasks = red (#ff6b6b)
 * - Events = teal (#4ecdc4)
 * - Notes/Inbox = yellow (#fbbf24)
 *
 * Blip size indicates priority (larger = more urgent)
 *
 * Note: Radar intentionally stays dark even in light mode - this is a design decision.
 */

import { useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { X, Bell, Keyboard, Plus, CheckSquare, Calendar, FolderOpen, FileText, Search, Check, ArrowRight } from 'lucide-react';
import { useQuickCapture } from '../../../contexts/QuickCaptureContext';

/**
 * Blip color configuration by item type (updated for Phase 1 design)
 */
const BLIP_COLORS = {
  task: '#ff6b6b',      // Red
  event: '#4ecdc4',     // Teal
  note: '#fbbf24',      // Yellow
  inbox: '#60a5fa',     // Blue
  project: '#a855f7',   // Purple
};

/**
 * Ring configuration
 * - ring 1 (NOW): 15% radius - items due within 1 hour
 * - ring 2 (TODAY): 30% radius - items due today
 * - ring 3 (THIS WEEK): 45% radius - items due this week
 */
const RINGS = [
  { id: 'now', label: 'NOW', radiusPercent: 30 },
  { id: 'today', label: 'TODAY', radiusPercent: 60 },
  { id: 'week', label: 'THIS WEEK', radiusPercent: 90 },
];

/**
 * Determine which ring an item belongs to based on due date
 *
 * @param {Date|string} dueDate - The item's due date
 * @returns {number} Ring number (1=NOW, 2=TODAY, 3=THIS WEEK)
 */
function getRingForDueDate(dueDate) {
  if (!dueDate) return 3; // No due date = outer ring

  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntil = (due - now) / (1000 * 60 * 60);

  if (hoursUntil <= 1) return 1;  // NOW - within 1 hour
  if (hoursUntil <= 24) return 2; // TODAY - within today
  return 3;                        // THIS WEEK - this week
}

/**
 * Calculate x,y position for a blip based on ring and angle
 *
 * @param {number} ring - Ring number (1, 2, or 3)
 * @param {number} angle - Angle in degrees (0-360)
 * @returns {{ left: string, top: string }} CSS positioning
 */
function calculateBlipPosition(ring, angle) {
  const ringConfig = RINGS[ring - 1] || RINGS[2];
  // Position blips at a percentage of the ring radius from center
  const radiusPercent = ringConfig.radiusPercent * 0.4; // Position within ring zone

  // Convert angle to radians (0 degrees = right, going counter-clockwise)
  const radians = (angle * Math.PI) / 180;

  const x = 50 + radiusPercent * Math.cos(radians);
  const y = 50 - radiusPercent * Math.sin(radians); // Negative because CSS y increases downward

  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

/**
 * Transform items into radar blips with positions
 *
 * @param {Array} items - Array of items
 * @param {string} type - Item type ('task', 'event', 'note', 'inbox')
 * @returns {Array} Array of blip objects with position data
 */
function transformItemsToBlips(items, type) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];

  return items.map((item, index) => {
    // Get due date field (tasks have dueDate, events have startDate)
    const dueDate = item.dueDate || item.startDate || item.createdAt;
    const ring = getRingForDueDate(dueDate);

    // Distribute items evenly within a sector based on type
    // Tasks: 270-360 degrees (top-right)
    // Events: 180-270 degrees (top-left)
    // Notes/Inbox: 90-180 degrees (bottom-left)
    let sectorStart, sectorEnd;
    switch (type) {
      case 'task':
        sectorStart = 270;
        sectorEnd = 360;
        break;
      case 'event':
        sectorStart = 180;
        sectorEnd = 270;
        break;
      case 'note':
        sectorStart = 90;
        sectorEnd = 180;
        break;
      case 'inbox':
        sectorStart = 0;
        sectorEnd = 90;
        break;
      default:
        sectorStart = 0;
        sectorEnd = 360;
    }

    // Calculate angle within sector
    const sectorRange = sectorEnd - sectorStart;
    const angle =
      items.length === 1
        ? sectorStart + sectorRange / 2 // Center if single item
        : sectorStart + 10 + ((sectorRange - 20) * index) / (items.length - 1); // Distribute with padding

    const position = calculateBlipPosition(ring, angle);

    // Determine size based on priority
    let size = 12; // Default size
    if (item.priority === 'high' || ring === 1) {
      size = 16; // Larger for urgent items
    } else if (item.priority === 'low') {
      size = 10; // Smaller for low priority
    }

    return {
      id: item._id || `${type}-${index}`,
      type,
      title: item.title || item.name || 'Untitled',
      left: position.left,
      top: position.top,
      size,
      ring,
      urgent: ring === 1 || item.priority === 'high',
      originalItem: item,
    };
  });
}

/**
 * Format current time for display
 */
function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format current date for display
 */
function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * RadarView Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the radar overlay is visible
 * @param {function} props.onClose - Callback when user closes the radar
 * @param {Array} props.tasks - Array of task objects
 * @param {Array} props.events - Array of event objects
 * @param {Array} props.inbox - Array of inbox/note items
 */
function RadarView({ isOpen, onClose, tasks = [], events = [], inbox = [] }) {
  const [currentTime, setCurrentTime] = useState(formatTime());
  const [selectedBlip, setSelectedBlip] = useState(null);
  const [focusedSector, setFocusedSector] = useState(null);

  // Quick Capture context for opening the modal
  const { openCapture } = useQuickCapture();

  // Radar control settings state
  const [radarSettings, setRadarSettings] = useState({
    sweep: true,
    sweepSpeed: 8,
    pulse: true,
    grid: true,
    blipSize: 'medium', // 'small' | 'medium' | 'large'
    labels: false,
    glow: true,
    sound: false,
  });

  // Ref to sweep element for dynamic animation speed
  const sweepRef = useRef(null);

  // Update time every minute
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentTime(formatTime());
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Update sweep animation speed when it changes
  useEffect(() => {
    if (sweepRef.current) {
      sweepRef.current.style.animationDuration = `${radarSettings.sweepSpeed}s`;
    }
  }, [radarSettings.sweepSpeed]);

  // Control handlers
  const updateSetting = useCallback((key, value) => {
    setRadarSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSetting = useCallback((key) => {
    setRadarSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Get blip size in pixels
  const getBlipSizeValue = useCallback((size) => {
    const sizes = { small: 8, medium: 12, large: 18 };
    return sizes[size] || 12;
  }, []);

  // Handle blip click - toggle side panel
  const handleBlipClick = useCallback((blip) => {
    if (selectedBlip?.id === blip.id) {
      // Same blip clicked - close panel (toggle)
      setSelectedBlip(null);
    } else {
      // Different blip - open/update panel
      setSelectedBlip(blip);
    }
  }, [selectedBlip]);

  // Close side panel
  const closePanel = useCallback(() => {
    setSelectedBlip(null);
  }, []);

  // Get meta info for panel based on item type
  const getItemMeta = useCallback((blip) => {
    if (!blip) return '';
    const item = blip.originalItem;
    if (blip.type === 'task') {
      return item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleDateString()}` : 'No due date';
    }
    if (blip.type === 'event') {
      return item.startDate ? `Starts: ${new Date(item.startDate).toLocaleString()}` : '';
    }
    return item.createdAt ? `Created: ${new Date(item.createdAt).toLocaleDateString()}` : '';
  }, []);

  // Handle panel action buttons
  const handlePanelAction = useCallback((action) => {
    if (!selectedBlip) return;

    if (action === 'done') {
      // TODO: Mark task as complete via API
      console.log('Mark as done:', selectedBlip.id);
    } else if (action === 'details') {
      // TODO: Navigate to item details or open edit panel
      console.log('View details:', selectedBlip.id);
    }

    closePanel();
  }, [selectedBlip, closePanel]);

  // Handle center click - open quick capture
  const handleCenterClick = useCallback(() => {
    openCapture();
  }, [openCapture]);

  // Handle sector focus - highlight blips in that sector temporarily
  const handleSectorFocus = useCallback((sector) => {
    setFocusedSector(sector);
    // Clear focus after 2 seconds
    setTimeout(() => setFocusedSector(null), 2000);
  }, []);

  // Handle keyboard shortcuts - ESC, sector shortcuts (T, E, P, N)
  const handleKeyDown = useCallback(
    (e) => {
      // Don't trigger shortcuts if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      // ESC key - close panel first, then radar
      if (key === 'escape') {
        if (selectedBlip) {
          closePanel();
        } else {
          onClose();
        }
        return;
      }

      // Sector shortcuts
      if (key === 't') {
        // Highlight tasks sector
        handleSectorFocus('task');
      } else if (key === 'e') {
        // Highlight events sector
        handleSectorFocus('event');
      } else if (key === 'p') {
        // Highlight projects sector
        handleSectorFocus('project');
      } else if (key === 'n') {
        // N opens quick capture
        openCapture();
      }
    },
    [onClose, selectedBlip, closePanel, handleSectorFocus, openCapture]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when radar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Transform all items into positioned blips
  // Note: useMemo must be called before any conditional returns (Rules of Hooks)
  const blips = useMemo(() => {
    return [
      ...transformItemsToBlips(tasks, 'task'),
      ...transformItemsToBlips(events, 'event'),
      ...transformItemsToBlips(inbox, 'inbox'),
    ];
  }, [tasks, events, inbox]);

  // Calculate stats
  // Note: useMemo must be called before any conditional returns (Rules of Hooks)
  const stats = useMemo(() => ({
    tasksToday: tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      return due.toDateString() === today.toDateString();
    }).length,
    events: events.length,
    projects: 0, // Placeholder - Phase 3 will add actual project count
    notes: inbox.length,
  }), [tasks, events, inbox]);

  // Don't render anything if not open
  if (!isOpen) return null;

  // Detect OS for keyboard shortcut display
  const isMac = navigator.platform?.toLowerCase().includes('mac');

  return (
    <div className="radar-view" role="dialog" aria-modal="true" aria-label="Radar view">
      {/* Topbar */}
      <div className="radar-topbar">
        <div className="radar-topbar-left">
          <div className="radar-logo">
            <div className="radar-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <span>myBrain</span>
          </div>
          <div className="radar-datetime">
            <span>{currentTime}</span> · <span>{formatDate()}</span>
          </div>
        </div>

        <div className="radar-topbar-center">
          <div className="radar-search">
            <Search size={14} />
            <span>Search everything...</span>
            <span className="radar-search-kbd">{isMac ? '⌘' : 'Ctrl+'}K</span>
          </div>
        </div>

        <div className="radar-topbar-right">
          <button className="radar-icon-btn" title="Notifications">
            <Bell size={18} />
          </button>
          <button className="radar-icon-btn" title="Keyboard shortcuts">
            <Keyboard size={18} />
          </button>
          <button className="radar-close-btn" onClick={onClose}>
            <X size={14} />
            <span>Exit Radar</span>
          </button>
        </div>
      </div>

      {/* Main Radar Area */}
      <div className="radar-main">
        <div className={`radar-container${!radarSettings.grid ? ' no-grid' : ''}`}>
          {/* Rings */}
          <div className="radar-rings">
            <div className="radar-ring week">
              <span className="radar-ring-label">THIS WEEK</span>
            </div>
            <div className="radar-ring today">
              <span className="radar-ring-label">TODAY</span>
            </div>
            <div className="radar-ring now">
              <span className="radar-ring-label">NOW</span>
            </div>
          </div>

          {/* Sweep Animation */}
          {radarSettings.sweep && (
            <div
              className="radar-sweep"
              ref={sweepRef}
              style={{ animationDuration: `${radarSettings.sweepSpeed}s` }}
            />
          )}

          {/* Center "YOU" element - click to open quick capture */}
          <div
            className="radar-center"
            onClick={handleCenterClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCenterClick();
              }
            }}
            role="button"
            tabIndex={0}
            title="Quick Capture (N)"
            aria-label="Quick Capture - click or press N"
          >
            <span className="radar-center-label">YOU</span>
          </div>

          {/* Blips Container */}
          <div className="blips-container">
            {blips.map((blip) => {
              // Calculate blip size based on settings
              const baseSize = getBlipSizeValue(radarSettings.blipSize);
              // Urgent items get a size boost
              const sizeMultiplier = blip.urgent ? 1.3 : 1;
              const finalSize = Math.round(baseSize * sizeMultiplier);

              // Build class names
              const blipClasses = [
                'blip',
                `${blip.type}s`,
                blip.urgent ? 'urgent' : '',
                !radarSettings.pulse ? 'no-pulse' : '',
                !radarSettings.glow && blip.urgent ? 'no-glow' : '',
                selectedBlip?.id === blip.id ? 'selected' : '',
                focusedSector === blip.type ? 'sector-focused' : '',
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={blip.id}
                  className={blipClasses}
                  style={{
                    left: blip.left,
                    top: blip.top,
                    width: `${finalSize}px`,
                    height: `${finalSize}px`,
                  }}
                  onClick={() => handleBlipClick(blip)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${blip.type}: ${blip.title}${blip.urgent ? ' (urgent)' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBlipClick(blip);
                    }
                  }}
                >
                  <span className={`blip-tooltip${radarSettings.labels ? ' always-visible' : ''}`}>
                    {blip.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sector Labels - click to focus, shows keyboard shortcut */}
          <div
            className={`sector-label tasks${focusedSector === 'task' ? ' focused' : ''}`}
            onClick={() => handleSectorFocus('task')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSectorFocus('task');
              }
            }}
          >
            <CheckSquare size={14} />
            <span>TASKS</span>
            <span className="sector-kbd">T</span>
          </div>
          <div
            className={`sector-label events${focusedSector === 'event' ? ' focused' : ''}`}
            onClick={() => handleSectorFocus('event')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSectorFocus('event');
              }
            }}
          >
            <Calendar size={14} />
            <span>EVENTS</span>
            <span className="sector-kbd">E</span>
          </div>
          <div
            className={`sector-label projects${focusedSector === 'project' ? ' focused' : ''}`}
            onClick={() => handleSectorFocus('project')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSectorFocus('project');
              }
            }}
          >
            <FolderOpen size={14} />
            <span>PROJECTS</span>
            <span className="sector-kbd">P</span>
          </div>
          <div
            className={`sector-label notes${focusedSector === 'inbox' ? ' focused' : ''}`}
            onClick={() => handleSectorFocus('inbox')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSectorFocus('inbox');
              }
            }}
          >
            <FileText size={14} />
            <span>NOTES</span>
            <span className="sector-kbd">N</span>
          </div>
        </div>

        {/* Side Panel for Blip Details */}
        <div className={`radar-side-panel ${selectedBlip ? 'open' : ''}`}>
          <div className="panel-header">
            <div className="panel-title">
              <span
                className="panel-title-dot"
                style={{ background: selectedBlip ? BLIP_COLORS[selectedBlip.type] : 'transparent' }}
              />
              <span>
                {selectedBlip?.type === 'task'
                  ? 'Task'
                  : selectedBlip?.type === 'event'
                  ? 'Event'
                  : selectedBlip?.type === 'inbox'
                  ? 'Inbox'
                  : 'Note'}
              </span>
            </div>
            <button
              className="panel-close"
              onClick={closePanel}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="panel-content">
            <div className="panel-item">
              <div
                className="panel-item-icon"
                style={{ background: selectedBlip ? BLIP_COLORS[selectedBlip.type] : 'transparent' }}
              />
              <div className="panel-item-details">
                <div className="panel-item-title">{selectedBlip?.title}</div>
                <div className="panel-item-meta">{getItemMeta(selectedBlip)}</div>
              </div>
              <div
                className={`panel-item-priority ${
                  selectedBlip?.ring === 1 ? 'urgent' : selectedBlip?.ring === 2 ? 'soon' : 'later'
                }`}
              >
                {selectedBlip?.ring === 1 ? 'NOW' : selectedBlip?.ring === 2 ? 'TODAY' : 'LATER'}
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="panel-action-btn done"
                onClick={() => handlePanelAction('done')}
              >
                <Check size={14} />
                <span>Done</span>
              </button>
              <button
                className="panel-action-btn"
                onClick={() => handlePanelAction('details')}
              >
                <span>Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottombar */}
      <div className="radar-bottombar">
        <div className="radar-stats-row">
          <div className="radar-stat-item">
            <div className="radar-stat-icon tasks">
              <CheckSquare size={14} />
            </div>
            <div className="radar-stat-info">
              <div className="radar-stat-value">{stats.tasksToday || tasks.length}</div>
              <div className="radar-stat-label">Tasks today</div>
            </div>
          </div>
          <div className="radar-stat-item">
            <div className="radar-stat-icon events">
              <Calendar size={14} />
            </div>
            <div className="radar-stat-info">
              <div className="radar-stat-value">{stats.events}</div>
              <div className="radar-stat-label">Events</div>
            </div>
          </div>
          <div className="radar-stat-item">
            <div className="radar-stat-icon projects">
              <FolderOpen size={14} />
            </div>
            <div className="radar-stat-info">
              <div className="radar-stat-value">{stats.projects}</div>
              <div className="radar-stat-label">Projects</div>
            </div>
          </div>
          <div className="radar-stat-item">
            <div className="radar-stat-icon notes">
              <FileText size={14} />
            </div>
            <div className="radar-stat-info">
              <div className="radar-stat-value">{stats.notes}</div>
              <div className="radar-stat-label">Notes</div>
            </div>
          </div>
        </div>

        {/* Radar Controls */}
        <div className="radar-controls">
          {/* Animation Group */}
          <div className="radar-control-group">
            <div className="radar-control">
              <label>Sweep</label>
              <button
                className={`radar-toggle${radarSettings.sweep ? ' active' : ''}`}
                onClick={() => toggleSetting('sweep')}
                aria-pressed={radarSettings.sweep}
                aria-label="Toggle sweep animation"
              />
            </div>
            <div className="radar-control">
              <label>Speed</label>
              <input
                type="range"
                min="2"
                max="16"
                value={radarSettings.sweepSpeed}
                onChange={(e) => updateSetting('sweepSpeed', parseInt(e.target.value, 10))}
                aria-label="Sweep speed"
              />
            </div>
            <div className="radar-control">
              <label>Pulse</label>
              <button
                className={`radar-toggle${radarSettings.pulse ? ' active' : ''}`}
                onClick={() => toggleSetting('pulse')}
                aria-pressed={radarSettings.pulse}
                aria-label="Toggle pulse animation"
              />
            </div>
          </div>

          {/* Display Group */}
          <div className="radar-control-group">
            <div className="radar-control">
              <label>Grid</label>
              <button
                className={`radar-toggle${radarSettings.grid ? ' active' : ''}`}
                onClick={() => toggleSetting('grid')}
                aria-pressed={radarSettings.grid}
                aria-label="Toggle grid lines"
              />
            </div>
            <div className="radar-control">
              <label>Blips</label>
              <div className="radar-size-selector">
                <button
                  className={`radar-size-btn${radarSettings.blipSize === 'small' ? ' active' : ''}`}
                  onClick={() => updateSetting('blipSize', 'small')}
                  title="Small"
                  aria-label="Small blips"
                  aria-pressed={radarSettings.blipSize === 'small'}
                >
                  <span className="size-dot small" />
                </button>
                <button
                  className={`radar-size-btn${radarSettings.blipSize === 'medium' ? ' active' : ''}`}
                  onClick={() => updateSetting('blipSize', 'medium')}
                  title="Medium"
                  aria-label="Medium blips"
                  aria-pressed={radarSettings.blipSize === 'medium'}
                >
                  <span className="size-dot medium" />
                </button>
                <button
                  className={`radar-size-btn${radarSettings.blipSize === 'large' ? ' active' : ''}`}
                  onClick={() => updateSetting('blipSize', 'large')}
                  title="Large"
                  aria-label="Large blips"
                  aria-pressed={radarSettings.blipSize === 'large'}
                >
                  <span className="size-dot large" />
                </button>
              </div>
            </div>
            <div className="radar-control">
              <label>Labels</label>
              <button
                className={`radar-toggle${radarSettings.labels ? ' active' : ''}`}
                onClick={() => toggleSetting('labels')}
                aria-pressed={radarSettings.labels}
                aria-label="Toggle always show labels"
              />
            </div>
          </div>

          {/* Effects Group */}
          <div className="radar-control-group">
            <div className="radar-control">
              <label>Glow</label>
              <button
                className={`radar-toggle${radarSettings.glow ? ' active' : ''}`}
                onClick={() => toggleSetting('glow')}
                aria-pressed={radarSettings.glow}
                aria-label="Toggle glow effect"
              />
            </div>
            <div className="radar-control disabled">
              <label>Sound</label>
              <button
                className="radar-toggle"
                disabled
                aria-label="Sound (coming soon)"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="radar-quick-actions">
          <button
            className="radar-quick-btn"
            onClick={handleCenterClick}
            aria-label="Quick Capture (press N)"
          >
            <Plus size={14} />
            <span>Quick Capture</span>
            <span className="kbd">N</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RadarView;
