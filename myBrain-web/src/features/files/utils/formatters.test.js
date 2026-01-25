import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBytes,
  formatRelativeDate,
  formatDate,
  formatDimensions,
  formatDuration,
  truncateFilename,
  formatPercentage,
  formatFileCount,
  formatFolderCount,
} from './formatters';

describe('formatters utilities', () => {
  // Test formatBytes function
  describe('formatBytes', () => {
    it('returns "0 B" for zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('returns "Unlimited" for -1', () => {
      expect(formatBytes(-1)).toBe('Unlimited');
    });

    it('returns "—" for null or undefined', () => {
      expect(formatBytes(null)).toBe('—');
      expect(formatBytes(undefined)).toBe('—');
    });

    it('formats bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(10240)).toBe('10 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(10485760)).toBe('10 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('formats terabytes correctly', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('respects decimal parameter', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1572864, 2)).toBe('1.5 MB');
    });
  });

  // Test formatRelativeDate function
  describe('formatRelativeDate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "—" for null or undefined', () => {
      expect(formatRelativeDate(null)).toBe('—');
      expect(formatRelativeDate(undefined)).toBe('—');
    });

    it('returns "Just now" for recent timestamps', () => {
      const now = new Date();
      vi.setSystemTime(now);
      expect(formatRelativeDate(now)).toBe('Just now');
      expect(formatRelativeDate(new Date(now.getTime() - 30000))).toBe('Just now');
    });

    it('returns minutes ago for timestamps within an hour', () => {
      const now = new Date();
      vi.setSystemTime(now);
      expect(formatRelativeDate(new Date(now.getTime() - 60000))).toBe('1m ago');
      expect(formatRelativeDate(new Date(now.getTime() - 300000))).toBe('5m ago');
      expect(formatRelativeDate(new Date(now.getTime() - 3540000))).toBe('59m ago');
    });

    it('returns hours ago for timestamps within a day', () => {
      const now = new Date();
      vi.setSystemTime(now);
      expect(formatRelativeDate(new Date(now.getTime() - 3600000))).toBe('1h ago');
      expect(formatRelativeDate(new Date(now.getTime() - 7200000))).toBe('2h ago');
      expect(formatRelativeDate(new Date(now.getTime() - 82800000))).toBe('23h ago');
    });

    it('returns days ago for timestamps within a week', () => {
      const now = new Date();
      vi.setSystemTime(now);
      expect(formatRelativeDate(new Date(now.getTime() - 86400000))).toBe('1d ago');
      expect(formatRelativeDate(new Date(now.getTime() - 259200000))).toBe('3d ago');
      expect(formatRelativeDate(new Date(now.getTime() - 518400000))).toBe('6d ago');
    });

    it('returns formatted date for older timestamps', () => {
      const now = new Date('2024-01-15');
      vi.setSystemTime(now);
      const oldDate = new Date('2024-01-01');
      // Should return a localized date string
      expect(formatRelativeDate(oldDate)).toMatch(/\d+/);
    });
  });

  // Test formatDate function
  describe('formatDate', () => {
    it('returns "—" for null or undefined', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
    });

    it('formats date without time by default', () => {
      const date = new Date('2024-03-15T10:30:00');
      const result = formatDate(date);
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('includes time when includeTime option is true', () => {
      const date = new Date('2024-03-15T10:30:00');
      const result = formatDate(date, { includeTime: true });
      expect(result).toMatch(/Mar/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/at/);
    });
  });

  // Test formatDimensions function
  describe('formatDimensions', () => {
    it('returns "—" for missing width or height', () => {
      expect(formatDimensions(null, 100)).toBe('—');
      expect(formatDimensions(100, null)).toBe('—');
      expect(formatDimensions(0, 100)).toBe('—');
      expect(formatDimensions(100, 0)).toBe('—');
      expect(formatDimensions(undefined, undefined)).toBe('—');
    });

    it('formats dimensions correctly', () => {
      expect(formatDimensions(1920, 1080)).toBe('1920 × 1080');
      expect(formatDimensions(800, 600)).toBe('800 × 600');
      expect(formatDimensions(100, 100)).toBe('100 × 100');
    });
  });

  // Test formatDuration function
  describe('formatDuration', () => {
    it('returns "—" for null or undefined', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(undefined)).toBe('—');
      expect(formatDuration(0)).toBe('—');
    });

    it('formats seconds correctly (under 1 minute)', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('formats minutes correctly (under 1 hour)', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(300)).toBe('5:00');
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('formats hours correctly', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7200)).toBe('2:00:00');
      expect(formatDuration(5400)).toBe('1:30:00');
    });
  });

  // Test truncateFilename function
  describe('truncateFilename', () => {
    it('returns filename as-is if shorter than maxLength', () => {
      expect(truncateFilename('short.txt')).toBe('short.txt');
      expect(truncateFilename('document.pdf', 30)).toBe('document.pdf');
    });

    it('returns null/undefined as-is', () => {
      expect(truncateFilename(null)).toBe(null);
      expect(truncateFilename(undefined)).toBe(undefined);
    });

    it('truncates long filenames in the middle', () => {
      const longName = 'this-is-a-very-long-filename-that-needs-truncation.pdf';
      const result = truncateFilename(longName, 30);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toContain('...');
      expect(result).toMatch(/\.pdf$/);
    });

    it('preserves file extension', () => {
      const result = truncateFilename('very-long-document-name-here.docx', 25);
      expect(result).toMatch(/\.docx$/);
    });

    it('handles files without extensions', () => {
      const result = truncateFilename('this-is-a-very-long-filename-without-extension', 30);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toContain('...');
    });
  });

  // Test formatPercentage function
  describe('formatPercentage', () => {
    it('returns "—" for invalid total', () => {
      expect(formatPercentage(50, 0)).toBe('—');
      expect(formatPercentage(50, null)).toBe('—');
      expect(formatPercentage(50, -1)).toBe('—');
    });

    it('calculates percentage correctly', () => {
      expect(formatPercentage(50, 100)).toBe('50%');
      expect(formatPercentage(25, 100)).toBe('25%');
      expect(formatPercentage(1, 3)).toBe('33%');
      expect(formatPercentage(100, 100)).toBe('100%');
    });

    it('handles zero value', () => {
      expect(formatPercentage(0, 100)).toBe('0%');
    });
  });

  // Test formatFileCount function
  describe('formatFileCount', () => {
    it('returns "—" for null or undefined', () => {
      expect(formatFileCount(null)).toBe('—');
      expect(formatFileCount(undefined)).toBe('—');
    });

    it('returns "No files" for zero', () => {
      expect(formatFileCount(0)).toBe('No files');
    });

    it('returns singular form for 1', () => {
      expect(formatFileCount(1)).toBe('1 file');
    });

    it('returns plural form for multiple', () => {
      expect(formatFileCount(2)).toBe('2 files');
      expect(formatFileCount(10)).toBe('10 files');
      expect(formatFileCount(1000)).toBe('1,000 files');
    });
  });

  // Test formatFolderCount function
  describe('formatFolderCount', () => {
    it('returns "—" for null or undefined', () => {
      expect(formatFolderCount(null)).toBe('—');
      expect(formatFolderCount(undefined)).toBe('—');
    });

    it('returns "No folders" for zero', () => {
      expect(formatFolderCount(0)).toBe('No folders');
    });

    it('returns singular form for 1', () => {
      expect(formatFolderCount(1)).toBe('1 folder');
    });

    it('returns plural form for multiple', () => {
      expect(formatFolderCount(2)).toBe('2 folders');
      expect(formatFolderCount(10)).toBe('10 folders');
      expect(formatFolderCount(1000)).toBe('1,000 folders');
    });
  });
});
