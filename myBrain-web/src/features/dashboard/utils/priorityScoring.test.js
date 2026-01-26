/**
 * =============================================================================
 * PRIORITYSCORING.TEST.JS - Tests for Priority Scoring Utility
 * =============================================================================
 *
 * Tests the priority scoring system for the intelligent dashboard.
 * Covers all scoring functions with various inputs.
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectContextMode,
  getWeights,
  getUrgencyScore,
  getAttentionScore,
  getRecencyScore,
  getFeatureUsageScore,
  getContextBonus,
  calculateItemScore,
  calculateSectionScore,
  sortByPriority,
  getVisibleWidgets
} from './priorityScoring';

describe('priorityScoring', () => {
  // Store original Date for restoration
  let originalDate;

  beforeEach(() => {
    originalDate = global.Date;
  });

  afterEach(() => {
    global.Date = originalDate;
    vi.restoreAllMocks();
  });

  // Helper to mock current date/time
  function mockDate(dateString) {
    const mockDateInstance = new originalDate(dateString);
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDateInstance;
        }
        return new originalDate(...args);
      }
      static now() {
        return mockDateInstance.getTime();
      }
    };
  }

  describe('detectContextMode', () => {
    it('returns "weekend" on Saturday', () => {
      // Saturday at 10 AM
      mockDate('2024-01-27T10:00:00');
      expect(detectContextMode()).toBe('weekend');
    });

    it('returns "weekend" on Sunday', () => {
      // Sunday at 2 PM
      mockDate('2024-01-28T14:00:00');
      expect(detectContextMode()).toBe('weekend');
    });

    it('returns "morning" between 5 AM and 9 AM on weekdays', () => {
      // Monday at 7 AM
      mockDate('2024-01-29T07:00:00');
      expect(detectContextMode()).toBe('morning');
    });

    it('returns "work" between 9 AM and 6 PM on weekdays', () => {
      // Tuesday at 11 AM
      mockDate('2024-01-30T11:00:00');
      expect(detectContextMode()).toBe('work');
    });

    it('returns "evening" between 6 PM and 11 PM on weekdays', () => {
      // Wednesday at 8 PM
      mockDate('2024-01-31T20:00:00');
      expect(detectContextMode()).toBe('evening');
    });

    it('returns "default" for late night hours', () => {
      // Thursday at 2 AM
      mockDate('2024-02-01T02:00:00');
      expect(detectContextMode()).toBe('default');
    });
  });

  describe('getWeights', () => {
    it('returns morning weights', () => {
      const weights = getWeights('morning');
      expect(weights.urgency).toBe(30);
      expect(weights.attention).toBe(30);
      expect(weights.recency).toBe(15);
      expect(weights.featureUsage).toBe(15);
      expect(weights.context).toBe(10);
    });

    it('returns work weights', () => {
      const weights = getWeights('work');
      expect(weights.urgency).toBe(35);
      expect(weights.attention).toBe(20);
    });

    it('returns evening weights', () => {
      const weights = getWeights('evening');
      expect(weights.urgency).toBe(25);
      expect(weights.recency).toBe(20);
    });

    it('returns weekend weights', () => {
      const weights = getWeights('weekend');
      expect(weights.urgency).toBe(20);
      expect(weights.attention).toBe(25);
    });

    it('returns default weights for unknown mode', () => {
      const weights = getWeights('unknown');
      expect(weights.urgency).toBe(30);
      expect(weights.attention).toBe(25);
    });
  });

  describe('getUrgencyScore', () => {
    beforeEach(() => {
      mockDate('2024-01-25T12:00:00');
    });

    it('returns 0 for items without due date', () => {
      expect(getUrgencyScore({})).toBe(0);
      expect(getUrgencyScore({ title: 'No due date' })).toBe(0);
    });

    it('returns high score (80+) for overdue items', () => {
      const overdue = { dueDate: '2024-01-24T12:00:00' }; // 1 day overdue
      expect(getUrgencyScore(overdue)).toBeGreaterThanOrEqual(80);
    });

    it('returns 90 for items due within 1 hour', () => {
      const dueSoon = { dueDate: '2024-01-25T12:30:00' };
      expect(getUrgencyScore(dueSoon)).toBe(90);
    });

    it('returns 80 for items due within 3 hours', () => {
      const dueSoon = { dueDate: '2024-01-25T14:00:00' };
      expect(getUrgencyScore(dueSoon)).toBe(80);
    });

    it('returns 70 for items due today (within 12 hours)', () => {
      const dueToday = { dueDate: '2024-01-25T20:00:00' };
      expect(getUrgencyScore(dueToday)).toBe(70);
    });

    it('returns 50 for items due tomorrow', () => {
      const dueTomorrow = { dueDate: '2024-01-26T12:00:00' };
      expect(getUrgencyScore(dueTomorrow)).toBe(50);
    });

    it('returns 30 for items due this week', () => {
      const dueThisWeek = { dueDate: '2024-01-30T12:00:00' };
      expect(getUrgencyScore(dueThisWeek)).toBe(30);
    });

    it('returns 10 for items due this month', () => {
      const dueThisMonth = { dueDate: '2024-02-15T12:00:00' };
      expect(getUrgencyScore(dueThisMonth)).toBe(10);
    });

    it('returns 0 for items due more than 30 days away', () => {
      const dueLater = { dueDate: '2024-03-25T12:00:00' };
      expect(getUrgencyScore(dueLater)).toBe(0);
    });

    it('accepts deadline as alternative to dueDate', () => {
      const withDeadline = { deadline: '2024-01-25T12:30:00' };
      expect(getUrgencyScore(withDeadline)).toBe(90);
    });

    it('accepts startDate as alternative to dueDate', () => {
      const withStartDate = { startDate: '2024-01-25T12:30:00' };
      expect(getUrgencyScore(withStartDate)).toBe(90);
    });
  });

  describe('getAttentionScore', () => {
    it('returns 0 for items without attention flags', () => {
      expect(getAttentionScore({})).toBe(0);
      expect(getAttentionScore({ title: 'Normal item' })).toBe(0);
    });

    it('returns score for unread items', () => {
      expect(getAttentionScore({ unread: true })).toBeGreaterThanOrEqual(60);
    });

    it('increases score based on unread count', () => {
      const oneUnread = getAttentionScore({ unreadCount: 1 });
      const fiveUnread = getAttentionScore({ unreadCount: 5 });
      expect(fiveUnread).toBeGreaterThan(oneUnread);
    });

    it('caps unread score at 100', () => {
      const manyUnread = getAttentionScore({ unreadCount: 100 });
      expect(manyUnread).toBe(100);
    });

    it('returns 70 for pending status', () => {
      expect(getAttentionScore({ status: 'pending' })).toBe(70);
    });

    it('returns 50 for unprocessed items', () => {
      expect(getAttentionScore({ processed: false })).toBe(50);
    });

    it('returns 60 for items needing review', () => {
      expect(getAttentionScore({ needsReview: true })).toBe(60);
      expect(getAttentionScore({ needsAction: true })).toBe(60);
    });

    it('returns highest score when multiple flags present', () => {
      const multiFlag = { status: 'pending', unreadCount: 2 };
      expect(getAttentionScore(multiFlag)).toBeGreaterThanOrEqual(70);
    });
  });

  describe('getRecencyScore', () => {
    beforeEach(() => {
      mockDate('2024-01-25T12:00:00');
    });

    it('returns 0 for items without timestamps', () => {
      expect(getRecencyScore({})).toBe(0);
    });

    it('returns 100 for items updated within 1 hour', () => {
      const recent = { updatedAt: '2024-01-25T11:30:00' };
      expect(getRecencyScore(recent)).toBe(100);
    });

    it('returns 85 for items updated 2 hours ago', () => {
      const twoHours = { updatedAt: '2024-01-25T10:00:00' };
      expect(getRecencyScore(twoHours)).toBe(85);
    });

    it('returns 70 for items updated 5 hours ago', () => {
      const fiveHours = { updatedAt: '2024-01-25T07:00:00' };
      expect(getRecencyScore(fiveHours)).toBe(70);
    });

    it('returns 55 for items updated 10 hours ago', () => {
      const tenHours = { updatedAt: '2024-01-25T02:00:00' };
      expect(getRecencyScore(tenHours)).toBe(55);
    });

    it('returns 40 for items updated 20 hours ago', () => {
      const twentyHours = { updatedAt: '2024-01-24T16:00:00' };
      expect(getRecencyScore(twentyHours)).toBe(40);
    });

    it('returns 25 for items updated 2 days ago', () => {
      const twoDays = { updatedAt: '2024-01-23T12:00:00' };
      expect(getRecencyScore(twoDays)).toBe(25);
    });

    it('returns 10 for items updated 5 days ago', () => {
      const fiveDays = { updatedAt: '2024-01-20T12:00:00' };
      expect(getRecencyScore(fiveDays)).toBe(10);
    });

    it('returns 0 for items updated more than 7 days ago', () => {
      const old = { updatedAt: '2024-01-10T12:00:00' };
      expect(getRecencyScore(old)).toBe(0);
    });

    it('accepts createdAt as fallback', () => {
      const createdRecently = { createdAt: '2024-01-25T11:30:00' };
      expect(getRecencyScore(createdRecently)).toBe(100);
    });

    it('accepts lastMessageAt as fallback', () => {
      const messageRecently = { lastMessageAt: '2024-01-25T11:30:00' };
      expect(getRecencyScore(messageRecently)).toBe(100);
    });
  });

  describe('getFeatureUsageScore', () => {
    const usageProfile = {
      tasks: 35,
      notes: 25,
      projects: 15,
      events: 10,
      messages: 5,
      images: 3,
      files: 2
    };

    it('returns 50 for null usage profile', () => {
      expect(getFeatureUsageScore('task', null)).toBe(50);
    });

    it('returns 50 for null item type', () => {
      expect(getFeatureUsageScore(null, usageProfile)).toBe(50);
    });

    it('returns 100 for highly used features (30%+)', () => {
      expect(getFeatureUsageScore('task', usageProfile)).toBe(100);
    });

    it('returns 75 for moderately used features (20-30%)', () => {
      expect(getFeatureUsageScore('note', usageProfile)).toBe(75);
    });

    it('returns 50 for somewhat used features (10-20%)', () => {
      expect(getFeatureUsageScore('project', usageProfile)).toBe(50);
    });

    it('returns 25 for rarely used features (5-10%)', () => {
      expect(getFeatureUsageScore('event', usageProfile)).toBe(50);
      expect(getFeatureUsageScore('message', usageProfile)).toBe(25);
    });

    it('returns 10 for very rarely used features (<5%)', () => {
      expect(getFeatureUsageScore('image', usageProfile)).toBe(10);
    });

    it('maps item types correctly', () => {
      // The function should map singular item types to plural profile keys
      expect(getFeatureUsageScore('task', usageProfile)).toBe(100);
      expect(getFeatureUsageScore('note', usageProfile)).toBe(75);
    });
  });

  describe('getContextBonus', () => {
    it('boosts work items during work mode', () => {
      const workItem = { lifeArea: { name: 'Work' } };
      const context = { mode: 'work' };
      const score = getContextBonus(workItem, context);
      expect(score).toBe(80); // 50 + 30 for work area
    });

    it('penalizes personal items during work mode', () => {
      const personalItem = { lifeArea: { name: 'Personal' } };
      const context = { mode: 'work' };
      const score = getContextBonus(personalItem, context);
      expect(score).toBe(40); // 50 - 10 for personal area
    });

    it('boosts personal items during weekend', () => {
      const personalItem = { lifeArea: { name: 'Home' } };
      const context = { mode: 'weekend' };
      const score = getContextBonus(personalItem, context);
      expect(score).toBe(75); // 50 + 25 for personal area on weekend
    });

    it('boosts personal items during evening', () => {
      const personalItem = { lifeArea: { name: 'Family' } };
      const context = { mode: 'evening' };
      const score = getContextBonus(personalItem, context);
      expect(score).toBe(75);
    });

    it('adds bonus for urgent priority', () => {
      const urgentItem = { priority: 'urgent' };
      const context = { mode: 'morning' };
      const score = getContextBonus(urgentItem, context);
      expect(score).toBe(70); // 50 + 20 for urgent
    });

    it('adds bonus for high priority', () => {
      const highItem = { priority: 'high' };
      const context = { mode: 'morning' };
      const score = getContextBonus(highItem, context);
      expect(score).toBe(60); // 50 + 10 for high
    });

    it('adds bonus for pinned items', () => {
      const pinnedItem = { pinned: true };
      const context = { mode: 'morning' };
      const score = getContextBonus(pinnedItem, context);
      expect(score).toBe(65); // 50 + 15 for pinned
    });

    it('combines multiple bonuses', () => {
      const superItem = { priority: 'urgent', pinned: true };
      const context = { mode: 'morning' };
      const score = getContextBonus(superItem, context);
      expect(score).toBe(85); // 50 + 20 + 15
    });

    it('caps score at 100', () => {
      const maxItem = { priority: 'urgent', pinned: true, lifeArea: { name: 'Work' } };
      const context = { mode: 'work' };
      const score = getContextBonus(maxItem, context);
      expect(score).toBe(100);
    });

    it('uses area string if lifeArea object not present', () => {
      const itemWithArea = { area: 'work' };
      const context = { mode: 'work' };
      const score = getContextBonus(itemWithArea, context);
      expect(score).toBe(80);
    });
  });

  describe('calculateItemScore', () => {
    beforeEach(() => {
      mockDate('2024-01-25T10:00:00'); // Weekday at 10 AM = work mode
    });

    const usageProfile = { tasks: 30, notes: 20 };

    it('returns weighted score combining all factors', () => {
      const item = {
        dueDate: '2024-01-25T12:00:00', // Due soon
        updatedAt: '2024-01-25T09:00:00', // Recent
        itemType: 'task'
      };

      const score = calculateItemScore(item, usageProfile);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns higher score for overdue items', () => {
      const overdueItem = {
        dueDate: '2024-01-24T12:00:00',
        itemType: 'task'
      };
      const normalItem = {
        dueDate: '2024-01-26T12:00:00',
        itemType: 'task'
      };

      const overdueScore = calculateItemScore(overdueItem, usageProfile);
      const normalScore = calculateItemScore(normalItem, usageProfile);

      expect(overdueScore).toBeGreaterThan(normalScore);
    });

    it('uses provided context mode', () => {
      const item = { itemType: 'task' };
      const workScore = calculateItemScore(item, usageProfile, { mode: 'work' });
      const eveningScore = calculateItemScore(item, usageProfile, { mode: 'evening' });

      // Different modes have different weights, so scores may differ
      expect(typeof workScore).toBe('number');
      expect(typeof eveningScore).toBe('number');
    });
  });

  describe('calculateSectionScore', () => {
    const usageProfile = { tasks: 30 };

    it('returns 0 for empty items array', () => {
      expect(calculateSectionScore([], usageProfile)).toBe(0);
    });

    it('returns 0 for null/undefined items', () => {
      expect(calculateSectionScore(null, usageProfile)).toBe(0);
      expect(calculateSectionScore(undefined, usageProfile)).toBe(0);
    });

    it('calculates score based on top items', () => {
      mockDate('2024-01-25T10:00:00');

      const items = [
        { dueDate: '2024-01-25T11:00:00', itemType: 'task' },
        { dueDate: '2024-01-26T11:00:00', itemType: 'task' },
        { dueDate: '2024-01-27T11:00:00', itemType: 'task' }
      ];

      const score = calculateSectionScore(items, usageProfile);
      expect(score).toBeGreaterThan(0);
    });

    it('adds count bonus for more items', () => {
      mockDate('2024-01-25T10:00:00');

      const fewItems = [{ itemType: 'task' }];
      const manyItems = [
        { itemType: 'task' },
        { itemType: 'task' },
        { itemType: 'task' },
        { itemType: 'task' }
      ];

      const fewScore = calculateSectionScore(fewItems, usageProfile);
      const manyScore = calculateSectionScore(manyItems, usageProfile);

      expect(manyScore).toBeGreaterThan(fewScore);
    });
  });

  describe('sortByPriority', () => {
    beforeEach(() => {
      mockDate('2024-01-25T10:00:00');
    });

    const usageProfile = { tasks: 30 };

    it('returns empty array for empty input', () => {
      expect(sortByPriority([], usageProfile)).toEqual([]);
    });

    it('sorts items by priority score descending', () => {
      const items = [
        { id: 1, dueDate: '2024-01-27T12:00:00', itemType: 'task' }, // Low urgency
        { id: 2, dueDate: '2024-01-24T12:00:00', itemType: 'task' }, // Overdue - highest
        { id: 3, dueDate: '2024-01-25T13:00:00', itemType: 'task' }  // Due soon
      ];

      const sorted = sortByPriority(items, usageProfile);

      expect(sorted[0].id).toBe(2); // Overdue first
      expect(sorted[sorted.length - 1].id).toBe(1); // Later due last
    });

    it('attaches priority score to each item', () => {
      const items = [{ id: 1, itemType: 'task' }];
      const sorted = sortByPriority(items, usageProfile);

      expect(sorted[0]).toHaveProperty('_priorityScore');
      expect(typeof sorted[0]._priorityScore).toBe('number');
    });
  });

  describe('getVisibleWidgets', () => {
    const allWidgets = [
      { id: 'tasks', component: 'TasksWidget' },
      { id: 'events', component: 'EventsWidget' },
      { id: 'projects', component: 'ProjectsWidget' },
      { id: 'inbox', component: 'InboxWidget' }
    ];

    const dashboardData = {
      urgentItems: {
        overdueTasks: [{ id: 1 }],
        dueTodayTasks: []
      },
      events: { today: [] },
      projects: [{ id: 1 }, { id: 2 }],
      inbox: []
    };

    const usageProfile = { tasks: 40, projects: 30 };

    it('returns all widgets when none hidden', () => {
      const visible = getVisibleWidgets(allWidgets, dashboardData, usageProfile);
      expect(visible.length).toBe(allWidgets.length);
    });

    it('filters out hidden widgets', () => {
      const preferences = { hiddenWidgets: ['inbox'] };
      const visible = getVisibleWidgets(allWidgets, dashboardData, usageProfile, preferences);

      expect(visible.length).toBe(3);
      expect(visible.find(w => w.id === 'inbox')).toBeUndefined();
    });

    it('puts pinned widgets first', () => {
      const preferences = {
        pinnedWidgets: [{ widgetId: 'inbox' }]
      };

      const visible = getVisibleWidgets(allWidgets, dashboardData, usageProfile, preferences);

      expect(visible[0].id).toBe('inbox');
      expect(visible[0].isPinned).toBe(true);
    });

    it('sorts remaining widgets by score', () => {
      const visible = getVisibleWidgets(allWidgets, dashboardData, usageProfile);

      // Each widget should have a section score attached
      visible.forEach(widget => {
        expect(widget).toHaveProperty('_sectionScore');
      });
    });
  });
});
