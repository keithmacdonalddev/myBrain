import { useState, useEffect } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
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
  Plus,
  ArrowRight
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
import { useSavedLocations } from '../../../hooks/useSavedLocations';
import { DatePicker, TimePicker } from '../../../components/ui/DateTimePicker';
import LocationPicker from '../../../components/ui/LocationPicker';

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
  { value: 'weekly-custom', label: 'Weekly on specific days' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
];

function EventModal({ event, initialDate, onClose, onCreated, taskIdToLink }) {
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const linkTaskMutation = useLinkTaskToEvent();
  const unlinkTaskMutation = useUnlinkTaskFromEvent();
  const linkNoteMutation = useLinkNoteToEvent();
  const unlinkNoteMutation = useUnlinkNoteFromEvent();

  // Saved locations for LocationPicker
  const { data: savedLocations = [] } = useSavedLocations();

  // Check if we're editing an existing event (has _id) or creating new
  const isEditing = !!event?._id;
  // For new events, we might have a title passed in (e.g., from task)
  const initialTitle = event?.title || '';

  // Search state for linking
  const [taskSearch, setTaskSearch] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [showTaskSearch, setShowTaskSearch] = useState(false);
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch tasks and notes for search
  const { data: tasksData } = useTasks({ search: taskSearch, limit: 5 });
  const { data: notesData } = useNotes({ search: noteSearch, limit: 5 });

  const searchTasks = tasksData?.tasks || [];
  const searchNotes = notesData?.notes || [];

  // Current linked items
  const linkedTasks = event?.linkedTasks || [];
  const linkedNotes = event?.linkedNotes || [];

  // Helper to format time as HH:MM
  const formatTime = (date) => {
    const d = new Date(date);
    const h = d.getHours();
    const m = Math.floor(d.getMinutes() / 15) * 15;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Form state
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(event?.description || '');
  const [allDay, setAllDay] = useState(event?.allDay || false);

  // Separate date and time state for better UX
  const [startDateValue, setStartDateValue] = useState(() => {
    if (event?.startDate) return new Date(event.startDate).toISOString();
    if (initialDate) return new Date(initialDate).toISOString();
    return new Date().toISOString();
  });
  const [startTime, setStartTime] = useState(() => {
    if (event?.startDate) return formatTime(event.startDate);
    if (initialDate) return formatTime(initialDate);
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return formatTime(d);
  });
  const [endDateValue, setEndDateValue] = useState(() => {
    if (event?.endDate) return new Date(event.endDate).toISOString();
    if (initialDate) return new Date(initialDate).toISOString();
    return new Date().toISOString();
  });
  const [endTime, setEndTime] = useState(() => {
    if (event?.endDate) return formatTime(event.endDate);
    if (initialDate) {
      const d = new Date(initialDate);
      d.setHours(d.getHours() + 1);
      return formatTime(d);
    }
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return formatTime(d);
  });

  // Combine date and time for submission
  const getStartDateTime = () => {
    const date = new Date(startDateValue);
    if (allDay) {
      date.setHours(0, 0, 0, 0);
    } else {
      const [h, m] = startTime.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    }
    return date.toISOString();
  };

  const getEndDateTime = () => {
    const date = new Date(endDateValue);
    if (allDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      const [h, m] = endTime.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    }
    return date.toISOString();
  };
  const [location, setLocation] = useState(event?.location || '');
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl || '');
  const [color, setColor] = useState(event?.color || '#3b82f6');
  const [recurrence, setRecurrence] = useState(() => {
    if (event?.recurrence?.frequency === 'weekly' && event?.recurrence?.daysOfWeek?.length > 0) {
      return 'weekly-custom';
    }
    return event?.recurrence?.frequency || '';
  });
  const [weeklyDays, setWeeklyDays] = useState(() => {
    if (event?.recurrence?.daysOfWeek?.length > 0) {
      return event.recurrence.daysOfWeek;
    }
    // Default to the day of the start date
    const startDay = initialDate ? new Date(initialDate).getDay() : new Date().getDay();
    return [startDay];
  });
  const [hasRecurrenceEnd, setHasRecurrenceEnd] = useState(!!event?.recurrence?.endDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => {
    if (event?.recurrence?.endDate) return new Date(event.recurrence.endDate).toISOString();
    // Default to 3 months from now
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return threeMonths.toISOString();
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update end date/time when start changes (for new events)
  useEffect(() => {
    if (!isEditing) {
      // Keep end date same as start date by default
      setEndDateValue(startDateValue);
      // Set end time 1 hour after start time
      const [h, m] = startTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      setEndTime(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }, [startDateValue, startTime, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Build recurrence object if recurrence is set
    let recurrenceData = null;
    if (recurrence) {
      const frequency = recurrence === 'weekly-custom' ? 'weekly' : recurrence;
      recurrenceData = {
        frequency,
        interval: 1,
      };
      // Add days of week for weekly-custom
      if (recurrence === 'weekly-custom' && weeklyDays.length > 0) {
        recurrenceData.daysOfWeek = weeklyDays.sort((a, b) => a - b);
      }
      // Add end date if specified
      if (hasRecurrenceEnd && recurrenceEndDate) {
        recurrenceData.endDate = new Date(recurrenceEndDate).toISOString();
      }
    }

    const eventData = {
      title: title.trim(),
      description: description.trim(),
      startDate: getStartDateTime(),
      endDate: getEndDateTime(),
      allDay,
      location: location.trim(),
      meetingUrl: meetingUrl.trim(),
      color,
      ...(recurrenceData && { recurrence: recurrenceData }),
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

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-panel glass-heavy border-t sm:border border-border rounded-t-2xl sm:rounded-lg shadow-theme-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-bg active:bg-bg/80 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
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

          {/* Date/Time Selection */}
          <div className="space-y-3">
            {/* Start */}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start
              </label>
              <div className={`grid gap-2 ${allDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <DatePicker
                  value={startDateValue}
                  onChange={setStartDateValue}
                />
                {!allDay && (
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                  />
                )}
              </div>
            </div>

            {/* End */}
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                End
              </label>
              <div className={`grid gap-2 ${allDay ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <DatePicker
                  value={endDateValue}
                  onChange={setEndDateValue}
                />
                {!allDay && (
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Location
            </label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              placeholder="Search for an address..."
              savedLocations={savedLocations}
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
              <div className="space-y-3">
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

                {/* Weekly days selection */}
                {recurrence === 'weekly-custom' && (
                  <div className="p-3 bg-bg border border-border rounded-lg">
                    <label className="block text-xs font-medium text-muted mb-2">
                      Repeat on these days
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = weeklyDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                // Don't allow deselecting if it's the only one
                                if (weeklyDays.length > 1) {
                                  setWeeklyDays(weeklyDays.filter(d => d !== day.value));
                                }
                              } else {
                                setWeeklyDays([...weeklyDays, day.value]);
                              }
                            }}
                            className={`w-11 h-11 sm:w-9 sm:h-9 rounded-full text-xs font-medium transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-panel border border-border text-muted hover:border-primary hover:text-text'
                            }`}
                            title={day.label}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {weeklyDays.length === 0
                        ? 'Select at least one day'
                        : `Repeats every ${weeklyDays
                            .sort((a, b) => a - b)
                            .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
                            .join(', ')}`
                      }
                    </p>
                  </div>
                )}

                {/* Recurrence end date */}
                {recurrence && (
                  <div className="p-3 bg-bg border border-border rounded-lg space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRecurrenceEnd}
                        onChange={(e) => setHasRecurrenceEnd(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-text">Set end date for repeat</span>
                    </label>

                    {hasRecurrenceEnd ? (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          Repeat until
                        </label>
                        <DatePicker
                          value={recurrenceEndDate}
                          onChange={setRecurrenceEndDate}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        Event will repeat indefinitely
                      </p>
                    )}
                  </div>
                )}
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
                        <div className="absolute top-full left-0 right-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-10 max-h-48 overflow-auto">
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
                        <div className="absolute top-full left-0 right-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-10 max-h-48 overflow-auto">
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
        <div className="p-4 border-t border-border flex flex-col sm:flex-row gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-3 text-sm text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] order-last sm:order-first"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <div className="flex-1 hidden sm:block" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-3 text-sm text-muted border border-border rounded-lg hover:bg-bg active:bg-bg/80 transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 sm:flex-initial px-6 py-3 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover active:bg-primary-hover/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
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

      {/* Delete Event Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete Event"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default EventModal;
