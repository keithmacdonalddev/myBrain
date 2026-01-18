import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  Repeat,
  Loader2,
  Trash2,
  AlertCircle,
  CheckSquare,
  StickyNote,
  Search,
  Plus
} from 'lucide-react';
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useLinkTaskToEvent,
  useUnlinkTaskFromEvent,
  useLinkNoteToEvent,
  useUnlinkNoteFromEvent
} from '../hooks/useEvents';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useNotes } from '../../notes/hooks/useNotes';
import useToast from '../../../hooks/useToast';

const EVENT_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
}

function formatDateOnly(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

function EventModal({ event, initialDate, onClose, onCreated, taskIdToLink }) {
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const linkTaskMutation = useLinkTaskToEvent();
  const unlinkTaskMutation = useUnlinkTaskFromEvent();
  const linkNoteMutation = useLinkNoteToEvent();
  const unlinkNoteMutation = useUnlinkNoteFromEvent();

  // Check if we're editing an existing event (has _id) or creating new
  const isEditing = !!event?._id;
  // For new events, we might have a title passed in (e.g., from task)
  const initialTitle = event?.title || '';

  // Search state for linking
  const [taskSearch, setTaskSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [showNoteSearch, setShowNoteSearch] = useState(false);

  // Fetch tasks and notes for search
  const { data: tasksData } = useTasks({ search: taskSearch, limit: 5 });
  const { data: notesData } = useNotes({ search: noteSearch, limit: 5 });

  const searchTasks = tasksData?.tasks || [];
  const searchNotes = notesData?.notes || [];

  // Current linked items
  const linkedTasks = event?.linkedTasks || [];
  const linkedNotes = event?.linkedNotes || [];

  // Form state
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(event?.description || '');
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [startDate, setStartDate] = useState(() => {
    if (event?.startDate) return formatDateForInput(event.startDate);
    if (initialDate) {
      const d = new Date(initialDate);
      d.setHours(9, 0, 0, 0);
      return formatDateForInput(d);
    }
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return formatDateForInput(d);
  });
  const [endDate, setEndDate] = useState(() => {
    if (event?.endDate) return formatDateForInput(event.endDate);
    if (initialDate) {
      const d = new Date(initialDate);
      d.setHours(10, 0, 0, 0);
      return formatDateForInput(d);
    }
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return formatDateForInput(d);
  });
  const [location, setLocation] = useState(event?.location || '');
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl || '');
  const [color, setColor] = useState(event?.color || '#3b82f6');
  const [recurrence, setRecurrence] = useState(event?.recurrence?.frequency || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update end date when start date changes
  useEffect(() => {
    if (startDate && !isEditing) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      setEndDate(formatDateForInput(end));
    }
  }, [startDate, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      startDate: allDay ? formatDateOnly(startDate) + 'T00:00:00' : startDate,
      endDate: allDay ? formatDateOnly(endDate) + 'T23:59:59' : endDate,
      allDay,
      location: location.trim(),
      meetingUrl: meetingUrl.trim(),
      color,
      ...(recurrence && {
        recurrence: {
          frequency: recurrence,
          interval: 1,
        },
      }),
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: event._id, data: eventData });
        toast.success('Event updated');
        onClose();
      } else {
        const result = await createMutation.mutateAsync(eventData);
        const newEventId = result?.event?._id;

        // Link task if taskIdToLink is provided
        if (newEventId && taskIdToLink) {
          try {
            await linkTaskMutation.mutateAsync({ eventId: newEventId, taskId: taskIdToLink });
            toast.success('Event created and linked to task');
          } catch (linkErr) {
            toast.success('Event created');
            toast.error('Failed to link task to event');
          }
        } else {
          toast.success('Event created');
        }

        // Call onCreated callback if provided
        if (onCreated && newEventId) {
          onCreated(newEventId);
        } else {
          onClose();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save event');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(event._id);
      toast.success('Event deleted');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete event');
    }
  };

  const handleLinkTask = async (taskId) => {
    if (!event?._id) return;
    try {
      await linkTaskMutation.mutateAsync({ eventId: event._id, taskId });
      setTaskSearch('');
      setShowTaskSearch(false);
      toast.success('Task linked');
    } catch (err) {
      toast.error(err.message || 'Failed to link task');
    }
  };

  const handleUnlinkTask = async (taskId) => {
    if (!event?._id) return;
    try {
      await unlinkTaskMutation.mutateAsync({ eventId: event._id, taskId });
      toast.success('Task unlinked');
    } catch (err) {
      toast.error(err.message || 'Failed to unlink task');
    }
  };

  const handleLinkNote = async (noteId) => {
    if (!event?._id) return;
    try {
      await linkNoteMutation.mutateAsync({ eventId: event._id, noteId });
      setNoteSearch('');
      setShowNoteSearch(false);
      toast.success('Note linked');
    } catch (err) {
      toast.error(err.message || 'Failed to link note');
    }
  };

  const handleUnlinkNote = async (noteId) => {
    if (!event?._id) return;
    try {
      await unlinkNoteMutation.mutateAsync({ eventId: event._id, noteId });
      toast.success('Note unlinked');
    } catch (err) {
      toast.error(err.message || 'Failed to unlink note');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel border border-border rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-lg font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* All Day Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text">All day</span>
          </label>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? formatDateOnly(startDate) : startDate}
                onChange={(e) => setStartDate(allDay ? e.target.value + 'T00:00' : e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                End
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? formatDateOnly(endDate) : endDate}
                onChange={(e) => setEndDate(allDay ? e.target.value + 'T23:59' : e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Meeting URL */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Meeting URL
            </label>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              rows={3}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              {/* Recurrence */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  <Repeat className="w-4 h-4 inline mr-1" />
                  Repeat
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Linked Tasks - only show when editing */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    <CheckSquare className="w-4 h-4 inline mr-1" />
                    Linked Tasks
                  </label>

                  {/* Linked task chips */}
                  {linkedTasks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {linkedTasks.map((task) => (
                        <div
                          key={task._id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-600 rounded-lg text-sm"
                        >
                          <CheckSquare className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{task.title}</span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkTask(task._id)}
                            className="p-0.5 hover:bg-green-500/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add task button/search */}
                  {showTaskSearch ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        placeholder="Search tasks..."
                        className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                      {taskSearch && searchTasks.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                          {searchTasks
                            .filter(t => !linkedTasks.some(lt => lt._id === t._id))
                            .map((task) => (
                              <button
                                key={task._id}
                                type="button"
                                onClick={() => handleLinkTask(task._id)}
                                className="w-full text-left px-3 py-2 hover:bg-bg transition-colors flex items-center gap-2"
                              >
                                <CheckSquare className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-text truncate">{task.title}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowTaskSearch(false);
                          setTaskSearch('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-bg rounded"
                      >
                        <X className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTaskSearch(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Link task
                    </button>
                  )}
                </div>
              )}

              {/* Linked Notes - only show when editing */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    <StickyNote className="w-4 h-4 inline mr-1" />
                    Linked Notes
                  </label>

                  {/* Linked note chips */}
                  {linkedNotes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {linkedNotes.map((note) => (
                        <div
                          key={note._id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
                        >
                          <StickyNote className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{note.title || 'Untitled'}</span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkNote(note._id)}
                            className="p-0.5 hover:bg-primary/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add note button/search */}
                  {showNoteSearch ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input
                        type="text"
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                      {noteSearch && searchNotes.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
                          {searchNotes
                            .filter(n => !linkedNotes.some(ln => ln._id === n._id))
                            .map((note) => (
                              <button
                                key={note._id}
                                type="button"
                                onClick={() => handleLinkNote(note._id)}
                                className="w-full text-left px-3 py-2 hover:bg-bg transition-colors flex items-center gap-2"
                              >
                                <StickyNote className="w-4 h-4 text-primary" />
                                <span className="text-sm text-text truncate">{note.title || 'Untitled'}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowNoteSearch(false);
                          setNoteSearch('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-bg rounded"
                      >
                        <X className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNoteSearch(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Link note
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {(createMutation.error || updateMutation.error) && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {createMutation.error?.message || updateMutation.error?.message}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update' : 'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventModal;
