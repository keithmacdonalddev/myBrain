/**
 * =============================================================================
 * DASHBOARDCARDS.JSX - Rich Dashboard Widget Cards
 * =============================================================================
 *
 * Feature-rich cards inspired by modern productivity apps (Tuduu, Notion, Leadly).
 * Dense layouts with colored tags, priority badges, progress indicators,
 * checkbox-style task indicators, note thumbnails, and glass morphism styling.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  CheckSquare,
  Calendar,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  Sparkles,
  Target,
  AlarmClock,
  MoreHorizontal,
  Flag,
  Hash,
  Loader2
} from 'lucide-react';
import { useCreateNote } from '../../notes/hooks/useNotes';
import { useCreateTask } from '../../tasks/hooks/useTasks';
import useToast from '../../../hooks/useToast';

// Priority config - colored badges like Image 3 & 6 inspiration
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', bg: '#ef4444', text: '#fff', dot: '#ef4444' },
  high: { label: 'High', bg: '#f97316', text: '#fff', dot: '#f97316' },
  medium: { label: 'Medium', bg: '#f59e0b', text: '#fff', dot: '#f59e0b' },
  low: { label: 'Low', bg: '#22c55e', text: '#fff', dot: '#22c55e' },
  none: { label: '', bg: '#9ca3af', text: '#fff', dot: '#9ca3af' }
};

// Tag color palette - matches inspiration images
const TAG_COLORS = [
  { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
  { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  { bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
];

function getTagColor(index) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Shared date formatter
function formatRelativeDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatShortDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// PRIORITY BADGE - Colored pill like inspiration images 3 & 6
// =============================================================================

function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.none;
  if (!priority || priority === 'none') return null;
  return (
    <span
      className="dash-priority-badge"
      style={{ background: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// TAG PILLS - Multiple colored tags per item like Image 3
// =============================================================================

function TagPills({ tags = [], maxVisible = 2 }) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <div className="dash-tag-pills">
      {visible.map((tag, idx) => {
        const color = getTagColor(hashString(tag.name || tag._id || String(idx)));
        return (
          <span
            key={tag._id || idx}
            className="dash-tag-pill"
            style={{ background: color.bg, color: color.text, borderColor: color.border }}
          >
            {tag.name || tag}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="dash-tag-pill dash-tag-pill-overflow">+{overflow}</span>
      )}
    </div>
  );
}

// =============================================================================
// TASKS WIDGET - Grouped by status with priority badges, checkbox indicators
// =============================================================================

export function TasksWidget({ overdueTasks = [], dueTodayTasks = [], upcomingTasks = [], onTaskClick }) {
  const [expandedSections, setExpandedSections] = useState({
    overdue: true,
    today: true,
    upcoming: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Task row - inspired by Image 3 table layout with checkbox, title, deadline, project, labels
  const TaskItem = ({ task, isOverdue }) => {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;
    const projectColor = task.project ? getTagColor(hashString(task.project._id || '')) : null;

    return (
      <button
        className={`dash-task-item ${isOverdue ? 'dash-task-item-overdue' : ''}`}
        onClick={() => onTaskClick?.(task)}
      >
        {/* Checkbox circle - like Image 3 & 5 */}
        <span className="dash-task-checkbox" style={{ borderColor: priority.dot }}>
          {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" style={{ color: priority.dot }} />}
        </span>

        <div className="dash-task-content">
          <div className="dash-task-title-row">
            <span className="dash-task-title">{task.title || 'Untitled'}</span>
            {/* Priority badge - colored pill like Image 6 */}
            <PriorityBadge priority={task.priority} />
          </div>

          <div className="dash-task-meta">
            {/* Due date */}
            {task.dueDate && (
              <span className={`dash-task-date ${isOverdue ? 'dash-task-date-overdue' : ''}`}>
                <Clock className="w-3 h-3" />
                {formatShortDate(task.dueDate)}
              </span>
            )}

            {/* Project tag - colored like Image 3 */}
            {task.project && (
              <span
                className="dash-task-tag"
                style={{
                  background: projectColor?.bg,
                  color: projectColor?.text,
                  borderColor: projectColor?.border
                }}
              >
                <FolderKanban className="w-2.5 h-2.5" />
                {task.project.title || 'Project'}
              </span>
            )}

            {/* Life area tag */}
            {task.lifeArea && (
              <span className="dash-task-tag dash-task-tag-area">
                {task.lifeArea.name}
              </span>
            )}

            {/* Tags - multiple colored pills like Image 3 */}
            {task.tags && task.tags.length > 0 && (
              <TagPills tags={task.tags} maxVisible={2} />
            )}
          </div>
        </div>

        {/* Overdue badge */}
        {isOverdue && (
          <span className="dash-overdue-badge">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        )}
      </button>
    );
  };

  // Section header - colored outline like Image 3 section headers
  const Section = ({ id, title, count, tasks, isOverdue, accentColor, icon: Icon }) => {
    const isExpanded = expandedSections[id];
    if (count === 0) return null;

    return (
      <div className="dash-task-section">
        <button
          className="dash-task-section-header"
          onClick={() => toggleSection(id)}
          style={{ '--section-accent': accentColor }}
        >
          {isExpanded ?
            <ChevronDown className="w-3.5 h-3.5" /> :
            <ChevronRight className="w-3.5 h-3.5" />
          }
          <span className="dash-task-section-title" style={{ borderColor: accentColor, color: accentColor }}>
            {Icon && <Icon className="w-3 h-3" />}
            {title}
          </span>
          <span className="dash-section-count" style={{ background: accentColor, color: '#fff' }}>{count}</span>
        </button>
        {isExpanded && (
          <div className="dash-task-section-items">
            {tasks.map(task => (
              <TaskItem key={task._id} task={task} isOverdue={isOverdue} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalTasks = overdueTasks.length + dueTodayTasks.length + upcomingTasks.length;

  return (
    <div className="dash-widget dash-widget-tasks">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-tasks">
            <CheckSquare className="w-4 h-4" />
          </span>
          <span>My Tasks</span>
          <span className="dash-widget-count">{totalTasks}</span>
        </div>
        <Link to="/app/tasks" className="dash-widget-link">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body">
        {totalTasks === 0 ? (
          <div className="dash-widget-empty">
            <Sparkles className="w-5 h-5" />
            <span>All caught up!</span>
            <span className="dash-widget-empty-sub">No tasks need your attention</span>
          </div>
        ) : (
          <>
            <Section
              id="overdue"
              title="Overdue"
              icon={AlertTriangle}
              count={overdueTasks.length}
              tasks={overdueTasks.slice(0, 5)}
              isOverdue={true}
              accentColor="#ef4444"
            />
            <Section
              id="today"
              title="Due Today"
              icon={Target}
              count={dueTodayTasks.length}
              tasks={dueTodayTasks.slice(0, 5)}
              isOverdue={false}
              accentColor="#f59e0b"
            />
            <Section
              id="upcoming"
              title="Upcoming"
              icon={Clock}
              count={upcomingTasks.length}
              tasks={upcomingTasks.slice(0, 4)}
              isOverdue={false}
              accentColor="#6b7280"
            />
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// NOTES WIDGET - With thumbnails, colored tags, and rich previews
// =============================================================================

export function NotesWidget({ notes = [], onNoteClick }) {
  const displayNotes = notes.slice(0, 5);

  return (
    <div className="dash-widget dash-widget-notes">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-notes">
            <FileText className="w-4 h-4" />
          </span>
          <span>Recent Notes</span>
          <span className="dash-widget-count">{notes.length}</span>
        </div>
        <Link to="/app/notes" className="dash-widget-link">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body">
        {displayNotes.length === 0 ? (
          <div className="dash-widget-empty">
            <FileText className="w-5 h-5" />
            <span>No recent notes</span>
          </div>
        ) : (
          <div className="dash-notes-list">
            {displayNotes.map((note, idx) => {
              const areaColor = note.lifeArea ? getTagColor(hashString(note.lifeArea._id || String(idx))) : null;
              const stripedContent = note.content ? note.content.replace(/<[^>]*>/g, '').trim() : '';

              return (
                <button
                  key={note._id}
                  className="dash-note-item"
                  onClick={() => onNoteClick?.(note)}
                >
                  {/* Left color accent bar like Image 6 event bars */}
                  <span
                    className="dash-note-accent"
                    style={{ background: areaColor?.text || '#6b7280' }}
                  />

                  <div className="dash-note-content">
                    <div className="dash-note-title-row">
                      <span className="dash-note-title">{note.title || 'Untitled'}</span>
                      <span className="dash-note-date">{formatRelativeDate(note.updatedAt)}</span>
                    </div>

                    {/* Content preview */}
                    {stripedContent && (
                      <span className="dash-note-preview">
                        {stripedContent.slice(0, 80)}{stripedContent.length > 80 ? '...' : ''}
                      </span>
                    )}

                    {/* Tags row - life area + tags */}
                    <div className="dash-note-tags">
                      {note.lifeArea && (
                        <span
                          className="dash-tag-pill"
                          style={{ background: areaColor?.bg, color: areaColor?.text }}
                        >
                          {note.lifeArea.name}
                        </span>
                      )}
                      {note.tags && note.tags.length > 0 && (
                        <TagPills tags={note.tags} maxVisible={2} />
                      )}
                      {note.project && (
                        <span className="dash-note-project-tag">
                          <FolderKanban className="w-2.5 h-2.5" />
                          {note.project.title}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// INBOX WIDGET - Unprocessed items with timestamps
// =============================================================================

export function InboxWidget({ notes = [], onNoteClick }) {
  const displayNotes = notes.slice(0, 5);

  return (
    <div className="dash-widget dash-widget-inbox">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-inbox">
            <Inbox className="w-4 h-4" />
          </span>
          <span>Inbox</span>
          {notes.length > 0 && (
            <span className="dash-widget-badge">{notes.length}</span>
          )}
        </div>
        <Link to="/app/inbox" className="dash-widget-link">
          Process <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body dash-widget-body-compact">
        {displayNotes.length === 0 ? (
          <div className="dash-widget-empty">
            <Sparkles className="w-5 h-5" />
            <span>Inbox clear!</span>
            <span className="dash-widget-empty-sub">Nothing to process</span>
          </div>
        ) : (
          <div className="dash-inbox-list">
            {displayNotes.map(note => (
              <button
                key={note._id}
                className="dash-inbox-item"
                onClick={() => onNoteClick?.(note)}
              >
                <Circle className="w-3.5 h-3.5 dash-inbox-dot" />
                <span className="dash-inbox-title">{note.title || 'Untitled'}</span>
                <span className="dash-inbox-time">{formatRelativeDate(note.createdAt || note.updatedAt)}</span>
              </button>
            ))}
            {notes.length > 5 && (
              <Link to="/app/inbox" className="dash-inbox-more">
                +{notes.length - 5} more items
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CALENDAR WIDGET - Today's schedule with rich event cards
// =============================================================================

export function CalendarWidget({ events = [], onEventClick }) {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const formatTime = (date) => {
    if (!date) return 'All day';
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="dash-widget dash-widget-calendar">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-calendar">
            <Calendar className="w-4 h-4" />
          </span>
          <span>Calendar</span>
          {events.length > 0 && (
            <span className="dash-widget-count">{events.length} events</span>
          )}
        </div>
        <Link to="/app/calendar" className="dash-widget-link">
          Full calendar <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body">
        {/* Week strip - like Image 6 calendar */}
        <div className="dash-calendar-strip">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className={`dash-calendar-day ${isToday ? 'dash-calendar-day-active' : ''}`}
              >
                <span className="dash-calendar-day-name">{dayNames[i]}</span>
                <span className="dash-calendar-day-num">{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Events list - colored bars like Image 6 */}
        <div className="dash-calendar-events">
          {events.length === 0 ? (
            <div className="dash-widget-empty-sm">
              <span>No events today</span>
            </div>
          ) : (
            events.slice(0, 4).map((event, idx) => (
              <button
                key={event._id}
                className="dash-calendar-event"
                onClick={() => onEventClick?.(event)}
              >
                <span
                  className="dash-calendar-event-bar"
                  style={{ background: TAG_COLORS[idx % TAG_COLORS.length].text }}
                />
                <div className="dash-calendar-event-info">
                  <span className="dash-calendar-event-time">{formatTime(event.startTime)}</span>
                  <span className="dash-calendar-event-title">{event.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 dash-calendar-event-arrow" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PROJECTS WIDGET - Active projects with progress bars and descriptions
// =============================================================================

export function ProjectsWidget({ projects = [], onProjectClick }) {
  const displayProjects = projects.slice(0, 4);

  return (
    <div className="dash-widget dash-widget-projects">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-projects">
            <FolderKanban className="w-4 h-4" />
          </span>
          <span>Projects</span>
          <span className="dash-widget-count">{projects.length}</span>
        </div>
        <Link to="/app/projects" className="dash-widget-link">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body">
        {displayProjects.length === 0 ? (
          <div className="dash-widget-empty">
            <FolderKanban className="w-5 h-5" />
            <span>No active projects</span>
          </div>
        ) : (
          <div className="dash-projects-list">
            {displayProjects.map((project, idx) => {
              const color = getTagColor(idx);
              const completedTasks = project.completedTaskCount || 0;
              const totalTasks = project.taskCount || 0;
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <button
                  key={project._id}
                  className="dash-project-item"
                  onClick={() => onProjectClick?.(project)}
                >
                  {/* Colored project icon - like Image 4 sidebar */}
                  <div
                    className="dash-project-icon"
                    style={{ background: color.bg, color: color.text }}
                  >
                    <Hash className="w-3.5 h-3.5" />
                  </div>

                  <div className="dash-project-content">
                    <div className="dash-project-title-row">
                      <span className="dash-project-title">{project.title}</span>
                      {/* Progress percentage - like Image 6 goals */}
                      {totalTasks > 0 && (
                        <span className="dash-project-pct" style={{ color: color.text }}>
                          {progress}%
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    {project.description && (
                      <span className="dash-project-desc">
                        {project.description.slice(0, 60)}{project.description.length > 60 ? '...' : ''}
                      </span>
                    )}

                    {/* Progress bar - like Image 6 goals progress */}
                    <div className="dash-project-progress">
                      <div className="dash-project-progress-bar">
                        <div
                          className="dash-project-progress-fill"
                          style={{ width: `${progress}%`, background: color.text }}
                        />
                      </div>
                      <span className="dash-project-progress-text">
                        {completedTasks}/{totalTasks} tasks
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ACTIVITY FEED WIDGET - Social activity from connections
// =============================================================================

export function ActivityWidget({ activities = [], currentUserId }) {
  // Get icon and color for activity type
  function getActivityStyle(type) {
    switch (type) {
      case 'project_created':
      case 'project_updated':
        return { icon: FolderKanban, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' };
      case 'project_completed':
      case 'task_completed':
        return { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
      case 'connection_made':
        return { icon: Plus, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'item_shared':
        return { icon: Flag, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' };
      case 'note_created':
      case 'note_updated':
        return { icon: FileText, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      default:
        return { icon: Circle, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' };
    }
  }

  // Get human-readable activity message
  function getActivityMessage(activity) {
    const title = activity.entitySnapshot?.title || 'an item';
    switch (activity.type) {
      case 'project_created': return `created project "${title}"`;
      case 'project_updated': return `updated project "${title}"`;
      case 'project_completed': return `completed project "${title}"`;
      case 'task_created': return `created task "${title}"`;
      case 'task_completed': return `completed task "${title}"`;
      case 'note_created': return `created note "${title}"`;
      case 'note_updated': return `updated note "${title}"`;
      case 'file_uploaded': return `uploaded "${title}"`;
      case 'connection_made': return `connected with ${title}`;
      case 'item_shared': return `shared "${title}"`;
      case 'profile_updated': return 'updated their profile';
      case 'status_updated': return 'updated their status';
      default: return 'did something';
    }
  }

  // Get user display name
  function getUserName(user) {
    if (!user) return 'Someone';
    return user.profile?.displayName || user.profile?.firstName || user.email?.split('@')[0] || 'Someone';
  }

  const displayActivities = activities.slice(0, 5);

  return (
    <div className="dash-widget dash-widget-activity">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-activity">
            <Sparkles className="w-4 h-4" />
          </span>
          <span>Activity</span>
          {activities.length > 0 && (
            <span className="dash-widget-count">{activities.length}</span>
          )}
        </div>
        <Link to="/app/connections" className="dash-widget-link">
          Connections <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="dash-widget-body">
        {displayActivities.length === 0 ? (
          <div className="dash-widget-empty">
            <Sparkles className="w-5 h-5" />
            <span>No recent activity</span>
            <span className="dash-widget-empty-sub">Connect with others to see updates</span>
          </div>
        ) : (
          <div className="dash-activity-list">
            {displayActivities.map(activity => {
              const { icon: Icon, color, bg } = getActivityStyle(activity.type);
              const isOwnActivity = activity.userId?._id === currentUserId;
              const userName = isOwnActivity ? 'You' : getUserName(activity.userId);

              return (
                <div key={activity._id} className="dash-activity-item">
                  <div className="dash-activity-icon" style={{ background: bg, color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="dash-activity-content">
                    <p className="dash-activity-text">
                      <span className="dash-activity-user">{userName}</span>
                      {' '}
                      <span className="dash-activity-action">{getActivityMessage(activity)}</span>
                    </p>
                    <span className="dash-activity-time">{formatRelativeDate(activity.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK CAPTURE - Prominent capture input (adds directly to inbox)
// =============================================================================

export function QuickCapture({ onTaskCreated }) {
  const [thought, setThought] = useState('');
  const [type, setType] = useState('note');
  const createNote = useCreateNote();
  const createTask = useCreateTask();
  const toast = useToast();

  const isSubmitting = createNote.isPending || createTask.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!thought.trim() || isSubmitting) return;

    try {
      if (type === 'note') {
        // Create note directly to inbox (unprocessed)
        await createNote.mutateAsync({
          title: thought.trim(),
          body: '',
          processed: false // This makes it appear in inbox
        });
        toast.success('Added to inbox');
      } else if (type === 'task') {
        // Create task directly
        const result = await createTask.mutateAsync({
          title: thought.trim()
        });
        toast.success('Task created');
        // Optionally open the task panel for further editing
        if (onTaskCreated && result?.data?.task?._id) {
          onTaskCreated(result.data.task._id);
        }
      }
      setThought('');
    } catch (err) {
      toast.error(`Failed to create ${type}`);
      console.error(`Failed to create ${type}:`, err);
    }
  };

  return (
    <form className="dash-capture" onSubmit={handleSubmit}>
      <input
        type="text"
        className="dash-capture-input"
        placeholder="Capture a thought..."
        value={thought}
        onChange={(e) => setThought(e.target.value)}
        disabled={isSubmitting}
      />
      <div className="dash-capture-actions">
        <button
          type="button"
          className={`dash-capture-type ${type === 'note' ? 'active' : ''}`}
          onClick={() => setType('note')}
          disabled={isSubmitting}
        >
          <FileText className="w-4 h-4" />
          Note
        </button>
        <button
          type="button"
          className={`dash-capture-type ${type === 'task' ? 'active' : ''}`}
          onClick={() => setType('task')}
          disabled={isSubmitting}
        >
          <CheckSquare className="w-4 h-4" />
          Task
        </button>
        <button
          type="submit"
          className="dash-capture-submit"
          disabled={!thought.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </div>
    </form>
  );
}
