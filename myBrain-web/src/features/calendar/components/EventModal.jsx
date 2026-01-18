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
  AlertCircle
} from 'lucide-react';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';
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

function EventModal({ event, initialDate, onClose }) {
  const toast = useToast();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const isEditing = !!event?._id;

  // Form state
  const [title, setTitle] = useState(event?.title || '');
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
      } else {
        await createMutation.mutateAsync(eventData);
        toast.success('Event created');
      }
      onClose();
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
