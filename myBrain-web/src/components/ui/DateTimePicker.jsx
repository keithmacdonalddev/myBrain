import { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Generate time options in 15-minute increments
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const label = `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    TIME_OPTIONS.push({ label, value });
  }
}

function CalendarDropdown({ value, onChange, onClose }) {
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const selectedDate = value ? new Date(value) : null;

  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -i);
      days.unshift({ date: d, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add days from next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const days = getDaysInMonth();
  const today = new Date();

  const isToday = (date) => date.toDateString() === today.toDateString();
  const isSelected = (date) => selectedDate && date.toDateString() === selectedDate.toDateString();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (date) => {
    onChange(date);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-50 p-3 w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 hover:bg-bg rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-muted" />
        </button>
        <span className="text-sm font-medium text-text">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 hover:bg-bg rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(({ date, isCurrentMonth }, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSelectDate(date)}
            className={`
              h-8 w-8 flex items-center justify-center rounded text-sm transition-colors
              ${isSelected(date)
                ? 'bg-primary text-white font-medium'
                : isToday(date)
                  ? 'bg-primary/10 text-primary font-medium'
                  : isCurrentMonth
                    ? 'text-text hover:bg-bg'
                    : 'text-muted/40 hover:bg-bg/50'
              }
            `}
          >
            {date.getDate()}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-2 pt-2 border-t border-border flex gap-2">
        <button
          type="button"
          onClick={() => handleSelectDate(new Date())}
          className="flex-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleSelectDate(new Date(Date.now() + 86400000))}
          className="flex-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
        >
          Tomorrow
        </button>
      </div>
    </div>
  );
}

function TimeDropdown({ value, onChange, onClose }) {
  const listRef = useRef(null);

  // Scroll to selected time on mount
  useEffect(() => {
    if (listRef.current && value) {
      const index = TIME_OPTIONS.findIndex(t => t.value === value);
      if (index >= 0) {
        const element = listRef.current.children[index];
        element?.scrollIntoView({ block: 'center' });
      }
    }
  }, [value]);

  return (
    <div className="absolute top-full left-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-50 w-32">
      <div ref={listRef} className="max-h-48 overflow-auto py-1">
        {TIME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              onClose();
            }}
            className={`
              w-full px-3 py-1.5 text-left text-sm transition-colors
              ${value === option.value
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-text hover:bg-bg'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DatePicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatDisplayDate = (date) => {
    if (!date) return 'Select date';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-muted mb-1">
          <Calendar className="w-4 h-4 inline mr-1" />
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <span className={value ? 'text-text' : 'text-muted'}>
          {formatDisplayDate(value)}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <CalendarDropdown
          value={value}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export function TimePicker({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'Select time';
    const option = TIME_OPTIONS.find(t => t.value === timeStr);
    return option ? option.label : timeStr;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-muted mb-1">
          <Clock className="w-4 h-4 inline mr-1" />
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <span className={value ? 'text-text' : 'text-muted'}>
          {formatDisplayTime(value)}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <TimeDropdown
          value={value}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export function DateTimePicker({ value, onChange, label, showTime = true }) {
  const dateValue = value ? new Date(value) : null;

  const timeString = dateValue
    ? `${dateValue.getHours().toString().padStart(2, '0')}:${Math.floor(dateValue.getMinutes() / 15) * 15 === dateValue.getMinutes() ? dateValue.getMinutes().toString().padStart(2, '0') : (Math.floor(dateValue.getMinutes() / 15) * 15).toString().padStart(2, '0')}`
    : '09:00';

  const handleDateChange = (newDate) => {
    const result = new Date(newDate);
    if (dateValue) {
      result.setHours(dateValue.getHours(), dateValue.getMinutes(), 0, 0);
    } else {
      result.setHours(9, 0, 0, 0);
    }
    onChange(result.toISOString());
  };

  const handleTimeChange = (newTime) => {
    const [hours, minutes] = newTime.split(':').map(Number);
    const result = dateValue ? new Date(dateValue) : new Date();
    result.setHours(hours, minutes, 0, 0);
    onChange(result.toISOString());
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-muted mb-1">
          {label}
        </label>
      )}
      <div className={`grid gap-2 ${showTime ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <DatePicker
          value={dateValue?.toISOString()}
          onChange={handleDateChange}
        />
        {showTime && (
          <TimePicker
            value={timeString}
            onChange={handleTimeChange}
          />
        )}
      </div>
    </div>
  );
}

export default DateTimePicker;
