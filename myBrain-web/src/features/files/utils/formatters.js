/**
 * File formatting utilities
 */

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  if (bytes === -1) return 'Unlimited';
  if (!bytes) return '—';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date) {
  if (!date) return '—';

  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString();
}

/**
 * Format a date for display
 */
export function formatDate(date, options = {}) {
  if (!date) return '—';

  const d = new Date(date);
  const { includeTime = false } = options;

  const dateStr = d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Format dimensions
 */
export function formatDimensions(width, height) {
  if (!width || !height) return '—';
  return `${width} × ${height}`;
}

/**
 * Format duration (seconds to mm:ss or hh:mm:ss)
 */
export function formatDuration(seconds) {
  if (!seconds) return '—';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Truncate filename in the middle
 */
export function truncateFilename(filename, maxLength = 30) {
  if (!filename || filename.length <= maxLength) return filename;

  const extension = filename.includes('.') ? filename.split('.').pop() : '';
  const name = extension ? filename.slice(0, -(extension.length + 1)) : filename;

  const availableLength = maxLength - extension.length - 4; // 4 for "..." and "."
  const frontLength = Math.ceil(availableLength / 2);
  const backLength = Math.floor(availableLength / 2);

  const truncatedName = name.slice(0, frontLength) + '...' + name.slice(-backLength);

  return extension ? `${truncatedName}.${extension}` : truncatedName;
}

/**
 * Get percentage string
 */
export function formatPercentage(value, total) {
  if (!total || total === -1) return '—';
  const percent = Math.round((value / total) * 100);
  return `${percent}%`;
}

/**
 * Format file count
 */
export function formatFileCount(count) {
  if (count === undefined || count === null) return '—';
  if (count === 0) return 'No files';
  if (count === 1) return '1 file';
  return `${count.toLocaleString()} files`;
}

/**
 * Format folder count
 */
export function formatFolderCount(count) {
  if (count === undefined || count === null) return '—';
  if (count === 0) return 'No folders';
  if (count === 1) return '1 folder';
  return `${count.toLocaleString()} folders`;
}
