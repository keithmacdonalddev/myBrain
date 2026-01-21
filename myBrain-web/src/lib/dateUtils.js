/**
 * Date formatting utilities
 * Centralized date manipulation and formatting functions
 */

/**
 * Get relative time string (e.g., "just now", "5m ago", "2h ago")
 * Used for save status, activity feeds, etc.
 *
 * @param {Date|string|number} date - The date to format
 * @returns {string} Relative time string
 */
export function getTimeAgo(date) {
  if (!date) return '';

  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // Fallback to time format for older dates
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get relative date string with more detail
 * e.g., "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago"
 *
 * @param {Date|string|number} date - The date to format
 * @returns {string} Relative date string
 */
export function getRelativeDate(date) {
  if (!date) return '—';

  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} weeks ago`;

  return formatDate(d);
}

/**
 * Format date for display (e.g., "Jan 15, 2024")
 *
 * @param {Date|string|number} date - The date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Include time in output
 * @param {boolean} options.includeYear - Include year (default: true if different year)
 * @param {'short' | 'long'} options.monthFormat - Month format (default: 'short')
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '—';

  const d = new Date(date);
  const now = new Date();
  const {
    includeTime = false,
    includeYear = d.getFullYear() !== now.getFullYear(),
    monthFormat = 'short',
  } = options;

  const dateOptions = {
    month: monthFormat,
    day: 'numeric',
    ...(includeYear && { year: 'numeric' }),
  };

  const dateStr = d.toLocaleDateString(undefined, dateOptions);

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Format time only (e.g., "2:30 PM")
 *
 * @param {Date|string|number} date - The date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSeconds - Include seconds
 * @param {boolean} options.use24Hour - Use 24-hour format
 * @returns {string} Formatted time string
 */
export function formatTime(date, options = {}) {
  if (!date) return '—';

  const d = new Date(date);
  const { includeSeconds = false, use24Hour = false } = options;

  return d.toLocaleTimeString([], {
    hour: use24Hour ? '2-digit' : 'numeric',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
    hour12: !use24Hour,
  });
}

/**
 * Format date and time together
 *
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return '—';

  const d = new Date(date);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format date for calendar/task display (e.g., "Mon, Jan 15")
 *
 * @param {Date|string|number} date - The date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeWeekday - Include day of week (default: true)
 * @returns {string} Formatted date string
 */
export function formatShortDate(date, options = {}) {
  if (!date) return '—';

  const d = new Date(date);
  const { includeWeekday = true } = options;

  return d.toLocaleDateString(undefined, {
    ...(includeWeekday && { weekday: 'short' }),
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get due date display info (text and styling class)
 * Used for tasks to show overdue, today, tomorrow, etc.
 *
 * @param {Date|string|number} dueDate - The due date
 * @returns {{ text: string, className: string, isOverdue: boolean }}
 */
export function getDueDateDisplay(dueDate) {
  if (!dueDate) return { text: '', className: '', isOverdue: false };

  const d = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: 'Overdue',
      className: 'text-red-500 bg-red-500/10',
      isOverdue: true,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Today',
      className: 'text-yellow-600 bg-yellow-500/10',
      isOverdue: false,
    };
  }

  if (diffDays === 1) {
    return {
      text: 'Tomorrow',
      className: 'text-blue-500 bg-blue-500/10',
      isOverdue: false,
    };
  }

  return {
    text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    className: 'text-muted bg-bg',
    isOverdue: false,
  };
}

/**
 * Check if a date is today
 *
 * @param {Date|string|number} date - The date to check
 * @returns {boolean}
 */
export function isToday(date) {
  if (!date) return false;

  const d = new Date(date);
  const now = new Date();

  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 *
 * @param {Date|string|number} date - The date to check
 * @returns {boolean}
 */
export function isYesterday(date) {
  if (!date) return false;

  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if a date is in the past
 *
 * @param {Date|string|number} date - The date to check
 * @returns {boolean}
 */
export function isPast(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

/**
 * Check if a date is in the future
 *
 * @param {Date|string|number} date - The date to check
 * @returns {boolean}
 */
export function isFuture(date) {
  if (!date) return false;
  return new Date(date) > new Date();
}

/**
 * Get the start of today (midnight)
 *
 * @returns {Date}
 */
export function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Get the end of today (11:59:59 PM)
 *
 * @returns {Date}
 */
export function getEndOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '—';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Parse a date string safely
 *
 * @param {Date|string|number|null} date - The date to parse
 * @returns {Date|null}
 */
export function parseDate(date) {
  if (!date) return null;
  if (date instanceof Date) return date;

  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date for input[type="date"] value
 *
 * @param {Date|string|number} date - The date to format
 * @returns {string} YYYY-MM-DD format
 */
export function toInputDateValue(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format time for input[type="time"] value
 *
 * @param {Date|string|number} date - The date to format
 * @returns {string} HH:MM format
 */
export function toInputTimeValue(date) {
  if (!date) return '';

  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}
