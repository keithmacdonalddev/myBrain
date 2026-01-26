/**
 * Tests for dateUtils.js
 * Testing date formatting, parsing, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeAgo,
  getRelativeDate,
  formatDate,
  formatTime,
  formatDateTime,
  formatShortDate,
  getDueDateDisplay,
  isToday,
  isYesterday,
  isPast,
  isFuture,
  getStartOfToday,
  getEndOfToday,
  formatDuration,
  parseDate,
  toInputDateValue,
  toInputTimeValue,
} from './dateUtils';

describe('dateUtils', () => {
  // Mock the current date for consistent testing
  const mockNow = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // getTimeAgo
  // ============================================================
  describe('getTimeAgo', () => {
    it('returns empty string for null/undefined input', () => {
      expect(getTimeAgo(null)).toBe('');
      expect(getTimeAgo(undefined)).toBe('');
      expect(getTimeAgo('')).toBe('');
    });

    it('returns "just now" for dates less than 5 seconds ago', () => {
      const date = new Date(mockNow.getTime() - 3000); // 3 seconds ago
      expect(getTimeAgo(date)).toBe('just now');
    });

    it('returns seconds ago for dates less than 1 minute ago', () => {
      const date = new Date(mockNow.getTime() - 30000); // 30 seconds ago
      expect(getTimeAgo(date)).toBe('30s ago');
    });

    it('returns minutes ago for dates less than 1 hour ago', () => {
      const date = new Date(mockNow.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(getTimeAgo(date)).toBe('5m ago');
    });

    it('returns hours ago for dates less than 1 day ago', () => {
      const date = new Date(mockNow.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(getTimeAgo(date)).toBe('3h ago');
    });

    it('returns days ago for dates less than 1 week ago', () => {
      const date = new Date(mockNow.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(getTimeAgo(date)).toBe('3d ago');
    });

    it('returns formatted time for dates more than 1 week ago', () => {
      const date = new Date(mockNow.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const result = getTimeAgo(date);
      // Should return time format like "12:00 PM" or similar locale string
      expect(result).toBeTruthy();
      expect(result).not.toContain('ago');
    });

    it('handles string date input', () => {
      const dateStr = new Date(mockNow.getTime() - 5 * 60 * 1000).toISOString();
      expect(getTimeAgo(dateStr)).toBe('5m ago');
    });

    it('handles numeric timestamp input', () => {
      const timestamp = mockNow.getTime() - 5 * 60 * 1000;
      expect(getTimeAgo(timestamp)).toBe('5m ago');
    });
  });

  // ============================================================
  // getRelativeDate
  // ============================================================
  describe('getRelativeDate', () => {
    it('returns em dash for null/undefined input', () => {
      expect(getRelativeDate(null)).toBe('—');
      expect(getRelativeDate(undefined)).toBe('—');
      expect(getRelativeDate('')).toBe('—');
    });

    it('returns "Just now" for dates less than 60 seconds ago', () => {
      const date = new Date(mockNow.getTime() - 30000); // 30 seconds ago
      expect(getRelativeDate(date)).toBe('Just now');
    });

    it('returns "1 minute ago" for exactly 1 minute ago', () => {
      const date = new Date(mockNow.getTime() - 60 * 1000); // 1 minute ago
      expect(getRelativeDate(date)).toBe('1 minute ago');
    });

    it('returns plural minutes for multiple minutes ago', () => {
      const date = new Date(mockNow.getTime() - 15 * 60 * 1000); // 15 minutes ago
      expect(getRelativeDate(date)).toBe('15 minutes ago');
    });

    it('returns "1 hour ago" for exactly 1 hour ago', () => {
      const date = new Date(mockNow.getTime() - 60 * 60 * 1000); // 1 hour ago
      expect(getRelativeDate(date)).toBe('1 hour ago');
    });

    it('returns plural hours for multiple hours ago', () => {
      const date = new Date(mockNow.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
      expect(getRelativeDate(date)).toBe('5 hours ago');
    });

    it('returns "Yesterday" for 1 day ago', () => {
      const date = new Date(mockNow.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      expect(getRelativeDate(date)).toBe('Yesterday');
    });

    it('returns days ago for dates less than 1 week ago', () => {
      const date = new Date(mockNow.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(getRelativeDate(date)).toBe('3 days ago');
    });

    it('returns weeks ago for dates less than 30 days ago', () => {
      const date = new Date(mockNow.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      expect(getRelativeDate(date)).toBe('2 weeks ago');
    });

    it('returns formatted date for dates more than 30 days ago', () => {
      const date = new Date(mockNow.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const result = getRelativeDate(date);
      // Should return something like "Apr 16" - a formatted date
      expect(result).toBeTruthy();
      expect(result).not.toContain('ago');
    });
  });

  // ============================================================
  // formatDate
  // ============================================================
  describe('formatDate', () => {
    it('returns em dash for null/undefined input', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
    });

    it('formats date without year when same year', () => {
      const date = new Date('2024-03-15T10:00:00.000Z');
      const result = formatDate(date);
      // Should include month and day but not year since same year as mockNow
      expect(result).toContain('15');
    });

    it('formats date with year when different year', () => {
      const date = new Date('2023-03-15T10:00:00.000Z');
      const result = formatDate(date);
      // Should include year since different from mockNow
      expect(result).toContain('2023');
    });

    it('includes time when includeTime option is true', () => {
      const date = new Date('2024-03-15T14:30:00.000Z');
      const result = formatDate(date, { includeTime: true });
      expect(result).toContain('at');
    });

    it('forces year inclusion with includeYear option', () => {
      const date = new Date('2024-03-15T10:00:00.000Z');
      const result = formatDate(date, { includeYear: true });
      expect(result).toContain('2024');
    });

    it('supports long month format', () => {
      const date = new Date('2024-03-15T10:00:00.000Z');
      const result = formatDate(date, { monthFormat: 'long' });
      expect(result).toContain('March');
    });

    it('handles Date object input', () => {
      const date = new Date('2024-03-15T10:00:00.000Z');
      expect(formatDate(date)).toBeTruthy();
    });

    it('handles string date input', () => {
      expect(formatDate('2024-03-15T10:00:00.000Z')).toBeTruthy();
    });

    it('handles numeric timestamp input', () => {
      const timestamp = new Date('2024-03-15T10:00:00.000Z').getTime();
      expect(formatDate(timestamp)).toBeTruthy();
    });
  });

  // ============================================================
  // formatTime
  // ============================================================
  describe('formatTime', () => {
    it('returns em dash for null/undefined input', () => {
      expect(formatTime(null)).toBe('—');
      expect(formatTime(undefined)).toBe('—');
      expect(formatTime('')).toBe('—');
    });

    it('formats time in 12-hour format by default', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      const result = formatTime(date);
      // Should contain AM or PM for 12-hour format (locale may format as "a.m." or "AM")
      expect(result.toLowerCase()).toMatch(/a\.?m\.?|p\.?m\.?/);
    });

    it('formats time in 24-hour format when use24Hour is true', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      const result = formatTime(date, { use24Hour: true });
      // Should not contain AM/PM
      expect(result.toLowerCase()).not.toMatch(/am|pm/);
    });

    it('includes seconds when includeSeconds is true', () => {
      const date = new Date('2024-06-15T14:30:45.000Z');
      const result = formatTime(date, { includeSeconds: true });
      // The result should have more characters due to seconds
      expect(result.length).toBeGreaterThan(5);
    });

    it('handles Date object input', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      expect(formatTime(date)).toBeTruthy();
    });

    it('handles string date input', () => {
      expect(formatTime('2024-06-15T14:30:00.000Z')).toBeTruthy();
    });
  });

  // ============================================================
  // formatDateTime
  // ============================================================
  describe('formatDateTime', () => {
    it('returns em dash for null/undefined input', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('')).toBe('—');
    });

    it('formats date and time together', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      const result = formatDateTime(date);
      // Should contain both date parts (month, day, year) and time parts
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('handles Date object input', () => {
      const date = new Date('2024-06-15T14:30:00.000Z');
      expect(formatDateTime(date)).toBeTruthy();
    });

    it('handles string date input', () => {
      expect(formatDateTime('2024-06-15T14:30:00.000Z')).toBeTruthy();
    });
  });

  // ============================================================
  // formatShortDate
  // ============================================================
  describe('formatShortDate', () => {
    it('returns em dash for null/undefined input', () => {
      expect(formatShortDate(null)).toBe('—');
      expect(formatShortDate(undefined)).toBe('—');
      expect(formatShortDate('')).toBe('—');
    });

    it('includes weekday by default', () => {
      const date = new Date('2024-06-15T10:00:00.000Z');
      const result = formatShortDate(date);
      // Should include day of week
      expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });

    it('excludes weekday when includeWeekday is false', () => {
      const date = new Date('2024-06-15T10:00:00.000Z');
      const result = formatShortDate(date, { includeWeekday: false });
      // Should not include day of week
      expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });

    it('handles Date object input', () => {
      const date = new Date('2024-06-15T10:00:00.000Z');
      expect(formatShortDate(date)).toBeTruthy();
    });
  });

  // ============================================================
  // getDueDateDisplay
  // ============================================================
  describe('getDueDateDisplay', () => {
    it('returns empty result for null/undefined input', () => {
      expect(getDueDateDisplay(null)).toEqual({ text: '', className: '', isOverdue: false });
      expect(getDueDateDisplay(undefined)).toEqual({ text: '', className: '', isOverdue: false });
    });

    it('returns Overdue for past dates', () => {
      const date = new Date(mockNow.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = getDueDateDisplay(date);
      expect(result.text).toBe('Overdue');
      expect(result.isOverdue).toBe(true);
      expect(result.className).toContain('red');
    });

    it('returns Today for today', () => {
      const result = getDueDateDisplay(mockNow);
      expect(result.text).toBe('Today');
      expect(result.isOverdue).toBe(false);
      expect(result.className).toContain('yellow');
    });

    it('returns Tomorrow for tomorrow', () => {
      const date = new Date(mockNow.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
      const result = getDueDateDisplay(date);
      expect(result.text).toBe('Tomorrow');
      expect(result.isOverdue).toBe(false);
      expect(result.className).toContain('blue');
    });

    it('returns formatted date for future dates beyond tomorrow', () => {
      const date = new Date(mockNow.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const result = getDueDateDisplay(date);
      expect(result.text).not.toBe('Today');
      expect(result.text).not.toBe('Tomorrow');
      expect(result.text).not.toBe('Overdue');
      expect(result.isOverdue).toBe(false);
    });
  });

  // ============================================================
  // isToday
  // ============================================================
  describe('isToday', () => {
    it('returns false for null/undefined input', () => {
      expect(isToday(null)).toBe(false);
      expect(isToday(undefined)).toBe(false);
      expect(isToday('')).toBe(false);
    });

    it('returns true for today', () => {
      expect(isToday(mockNow)).toBe(true);
    });

    it('returns true for different time same day', () => {
      const morning = new Date('2024-06-15T06:00:00.000Z');
      expect(isToday(morning)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date(mockNow.getTime() - 24 * 60 * 60 * 1000);
      expect(isToday(yesterday)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = new Date(mockNow.getTime() + 24 * 60 * 60 * 1000);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('handles string date input', () => {
      expect(isToday('2024-06-15T18:00:00.000Z')).toBe(true);
    });

    it('handles numeric timestamp input', () => {
      expect(isToday(mockNow.getTime())).toBe(true);
    });
  });

  // ============================================================
  // isYesterday
  // ============================================================
  describe('isYesterday', () => {
    it('returns false for null/undefined input', () => {
      expect(isYesterday(null)).toBe(false);
      expect(isYesterday(undefined)).toBe(false);
      expect(isYesterday('')).toBe(false);
    });

    it('returns true for yesterday', () => {
      const yesterday = new Date('2024-06-14T12:00:00.000Z');
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('returns true for different time yesterday', () => {
      const yesterdayMorning = new Date('2024-06-14T06:00:00.000Z');
      expect(isYesterday(yesterdayMorning)).toBe(true);
    });

    it('returns false for today', () => {
      expect(isYesterday(mockNow)).toBe(false);
    });

    it('returns false for two days ago', () => {
      const twoDaysAgo = new Date(mockNow.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('handles string date input', () => {
      expect(isYesterday('2024-06-14T18:00:00.000Z')).toBe(true);
    });
  });

  // ============================================================
  // isPast
  // ============================================================
  describe('isPast', () => {
    it('returns false for null/undefined input', () => {
      expect(isPast(null)).toBe(false);
      expect(isPast(undefined)).toBe(false);
      expect(isPast('')).toBe(false);
    });

    it('returns true for dates in the past', () => {
      const pastDate = new Date(mockNow.getTime() - 60000); // 1 minute ago
      expect(isPast(pastDate)).toBe(true);
    });

    it('returns false for dates in the future', () => {
      const futureDate = new Date(mockNow.getTime() + 60000); // 1 minute from now
      expect(isPast(futureDate)).toBe(false);
    });

    it('handles string date input', () => {
      expect(isPast('2024-01-01T00:00:00.000Z')).toBe(true);
    });

    it('handles numeric timestamp input', () => {
      expect(isPast(mockNow.getTime() - 1000)).toBe(true);
    });
  });

  // ============================================================
  // isFuture
  // ============================================================
  describe('isFuture', () => {
    it('returns false for null/undefined input', () => {
      expect(isFuture(null)).toBe(false);
      expect(isFuture(undefined)).toBe(false);
      expect(isFuture('')).toBe(false);
    });

    it('returns true for dates in the future', () => {
      const futureDate = new Date(mockNow.getTime() + 60000); // 1 minute from now
      expect(isFuture(futureDate)).toBe(true);
    });

    it('returns false for dates in the past', () => {
      const pastDate = new Date(mockNow.getTime() - 60000); // 1 minute ago
      expect(isFuture(pastDate)).toBe(false);
    });

    it('handles string date input', () => {
      expect(isFuture('2025-01-01T00:00:00.000Z')).toBe(true);
    });

    it('handles numeric timestamp input', () => {
      expect(isFuture(mockNow.getTime() + 1000)).toBe(true);
    });
  });

  // ============================================================
  // getStartOfToday
  // ============================================================
  describe('getStartOfToday', () => {
    it('returns midnight of today', () => {
      const result = getStartOfToday();
      expect(result.getFullYear()).toBe(mockNow.getFullYear());
      expect(result.getMonth()).toBe(mockNow.getMonth());
      expect(result.getDate()).toBe(mockNow.getDate());
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('returns a Date object', () => {
      expect(getStartOfToday()).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // getEndOfToday
  // ============================================================
  describe('getEndOfToday', () => {
    it('returns 11:59:59.999 PM of today', () => {
      const result = getEndOfToday();
      expect(result.getFullYear()).toBe(mockNow.getFullYear());
      expect(result.getMonth()).toBe(mockNow.getMonth());
      expect(result.getDate()).toBe(mockNow.getDate());
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('returns a Date object', () => {
      expect(getEndOfToday()).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // formatDuration
  // ============================================================
  describe('formatDuration', () => {
    it('returns em dash for null/undefined/zero/negative input', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(undefined)).toBe('—');
      expect(formatDuration(0)).toBe('—');
      expect(formatDuration(-1000)).toBe('—');
    });

    it('formats seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(30000)).toBe('30s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(150000)).toBe('2m 30s');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3665000)).toBe('1h 1m');
      expect(formatDuration(7320000)).toBe('2h 2m');
    });

    it('formats days and hours', () => {
      expect(formatDuration(90000000)).toBe('1d 1h');
      expect(formatDuration(176400000)).toBe('2d 1h');
    });

    it('handles edge case of exactly 1 minute', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
    });

    it('handles edge case of exactly 1 hour', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
    });

    it('handles edge case of exactly 1 day', () => {
      expect(formatDuration(86400000)).toBe('1d 0h');
    });
  });

  // ============================================================
  // parseDate
  // ============================================================
  describe('parseDate', () => {
    it('returns null for null/undefined input', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate('')).toBeNull();
    });

    it('returns the same Date object for Date input', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      expect(parseDate(date)).toBe(date);
    });

    it('parses valid ISO string', () => {
      const result = parseDate('2024-06-15T12:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date('2024-06-15T12:00:00.000Z').getTime());
    });

    it('parses valid timestamp number', () => {
      const timestamp = 1718452800000;
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('returns null for invalid date string', () => {
      expect(parseDate('not a date')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
    });

    it('handles various date string formats', () => {
      // YYYY-MM-DD format
      const result1 = parseDate('2024-06-15');
      expect(result1).toBeInstanceOf(Date);

      // Full date string
      const result2 = parseDate('June 15, 2024');
      expect(result2).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // toInputDateValue
  // ============================================================
  describe('toInputDateValue', () => {
    it('returns empty string for null/undefined input', () => {
      expect(toInputDateValue(null)).toBe('');
      expect(toInputDateValue(undefined)).toBe('');
      expect(toInputDateValue('')).toBe('');
    });

    it('formats date to YYYY-MM-DD', () => {
      // Using a date that works regardless of timezone
      const date = new Date(2024, 5, 15); // June 15, 2024 in local time
      expect(toInputDateValue(date)).toBe('2024-06-15');
    });

    it('pads single-digit months and days', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024 in local time
      expect(toInputDateValue(date)).toBe('2024-01-05');
    });

    it('handles end of month correctly', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024 in local time
      expect(toInputDateValue(date)).toBe('2024-12-31');
    });

    it('handles Date object input', () => {
      const date = new Date(2024, 5, 15);
      expect(toInputDateValue(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles string date input', () => {
      const date = new Date(2024, 5, 15);
      expect(toInputDateValue(date.toISOString())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles numeric timestamp input', () => {
      const date = new Date(2024, 5, 15);
      expect(toInputDateValue(date.getTime())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ============================================================
  // toInputTimeValue
  // ============================================================
  describe('toInputTimeValue', () => {
    it('returns empty string for null/undefined input', () => {
      expect(toInputTimeValue(null)).toBe('');
      expect(toInputTimeValue(undefined)).toBe('');
      expect(toInputTimeValue('')).toBe('');
    });

    it('formats time to HH:MM', () => {
      const date = new Date(2024, 5, 15, 14, 30, 0); // 2:30 PM local time
      expect(toInputTimeValue(date)).toBe('14:30');
    });

    it('pads single-digit hours and minutes', () => {
      const date = new Date(2024, 5, 15, 9, 5, 0); // 9:05 AM local time
      expect(toInputTimeValue(date)).toBe('09:05');
    });

    it('handles midnight correctly', () => {
      const date = new Date(2024, 5, 15, 0, 0, 0);
      expect(toInputTimeValue(date)).toBe('00:00');
    });

    it('handles 11:59 PM correctly', () => {
      const date = new Date(2024, 5, 15, 23, 59, 0);
      expect(toInputTimeValue(date)).toBe('23:59');
    });

    it('handles Date object input', () => {
      const date = new Date(2024, 5, 15, 14, 30, 0);
      expect(toInputTimeValue(date)).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles string date input', () => {
      const date = new Date(2024, 5, 15, 14, 30, 0);
      const result = toInputTimeValue(date.toISOString());
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles numeric timestamp input', () => {
      const date = new Date(2024, 5, 15, 14, 30, 0);
      const result = toInputTimeValue(date.getTime());
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  // ============================================================
  // Edge Cases and Integration Tests
  // ============================================================
  describe('Edge Cases', () => {
    it('handles invalid Date objects gracefully', () => {
      const invalidDate = new Date('invalid');
      // parseDate returns the Date object as-is if it's already a Date (even invalid)
      // The function checks isNaN only for parsed strings/numbers, not Date objects
      // This test validates that behavior - Date objects are passed through
      const result = parseDate(invalidDate);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('handles dates at year boundaries', () => {
      const newYearsEve = new Date(2024, 11, 31, 23, 59, 59);
      const newYearsDay = new Date(2025, 0, 1, 0, 0, 0);

      expect(toInputDateValue(newYearsEve)).toBe('2024-12-31');
      expect(toInputDateValue(newYearsDay)).toBe('2025-01-01');
    });

    it('handles leap year dates', () => {
      const leapDay = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(toInputDateValue(leapDay)).toBe('2024-02-29');
    });

    it('handles dates far in the past', () => {
      const oldDate = new Date(1970, 0, 1);
      expect(toInputDateValue(oldDate)).toBe('1970-01-01');
      expect(isPast(oldDate)).toBe(true);
      expect(isFuture(oldDate)).toBe(false);
    });

    it('handles dates far in the future', () => {
      const futureDate = new Date(2099, 11, 31);
      expect(toInputDateValue(futureDate)).toBe('2099-12-31');
      expect(isPast(futureDate)).toBe(false);
      expect(isFuture(futureDate)).toBe(true);
    });

    it('boundary between today and yesterday works correctly', () => {
      // Create dates in local time to avoid timezone conversion issues
      // Use the mockNow date parts for consistency
      const yesterday = new Date(2024, 5, 14, 12, 0, 0); // June 14, 2024 at noon local time
      expect(isToday(yesterday)).toBe(false);
      expect(isYesterday(yesterday)).toBe(true);

      // Today at different times
      const todayMorning = new Date(2024, 5, 15, 6, 0, 0); // June 15, 2024 at 6 AM local time
      expect(isToday(todayMorning)).toBe(true);
      expect(isYesterday(todayMorning)).toBe(false);

      const todayEvening = new Date(2024, 5, 15, 23, 59, 59); // June 15, 2024 at 11:59 PM local time
      expect(isToday(todayEvening)).toBe(true);
      expect(isYesterday(todayEvening)).toBe(false);
    });
  });
});
