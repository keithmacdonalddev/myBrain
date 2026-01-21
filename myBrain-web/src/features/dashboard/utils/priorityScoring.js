/**
 * =============================================================================
 * PRIORITYSCORING.JS - Intelligent Dashboard Priority Calculations
 * =============================================================================
 *
 * This module implements the priority scoring system for the intelligent
 * dashboard. It calculates scores based on 5 weighted factors:
 *
 * 1. URGENCY (0-100) - Time-sensitivity
 *    - Overdue items score high
 *    - Items due soon score based on proximity
 *
 * 2. ATTENTION (0-100) - Needs human response
 *    - Unread messages
 *    - Pending share invites
 *    - Unprocessed inbox items
 *
 * 3. RECENCY (0-100) - Recently created/modified
 *    - Items from last 24 hours score highest
 *    - Decays over time
 *
 * 4. FEATURE USAGE (0-100) - User's preferred features
 *    - Features the user interacts with most get priority
 *    - Based on 30-day rolling usage profile
 *
 * 5. CONTEXT (0-100) - Time/situation awareness
 *    - Morning mode: Focus on day planning
 *    - Work hours: Prioritize work items
 *    - Evening: Review and wrap-up
 *    - Weekend: Personal items
 *
 * WEIGHT CONFIGURATIONS:
 * Weights vary by context mode:
 * - Morning: { urgency: 30, attention: 30, recency: 15, featureUsage: 15, context: 10 }
 * - Work: { urgency: 35, attention: 20, recency: 15, featureUsage: 20, context: 10 }
 * - Evening: { urgency: 25, attention: 25, recency: 20, featureUsage: 15, context: 15 }
 * - Weekend: { urgency: 20, attention: 25, recency: 20, featureUsage: 20, context: 15 }
 *
 * =============================================================================
 */

// =============================================================================
// WEIGHT CONFIGURATIONS BY CONTEXT MODE
// =============================================================================

const WEIGHT_CONFIGS = {
  morning: {
    urgency: 30,
    attention: 30,
    recency: 15,
    featureUsage: 15,
    context: 10
  },
  work: {
    urgency: 35,
    attention: 20,
    recency: 15,
    featureUsage: 20,
    context: 10
  },
  evening: {
    urgency: 25,
    attention: 25,
    recency: 20,
    featureUsage: 15,
    context: 15
  },
  weekend: {
    urgency: 20,
    attention: 25,
    recency: 20,
    featureUsage: 20,
    context: 15
  },
  default: {
    urgency: 30,
    attention: 25,
    recency: 15,
    featureUsage: 20,
    context: 10
  }
};

// =============================================================================
// CONTEXT DETECTION
// =============================================================================

/**
 * detectContextMode()
 * -------------------
 * Detects the current context mode based on time and day.
 *
 * @returns {string} Context mode: 'morning', 'work', 'evening', 'weekend'
 */
export function detectContextMode() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend detection
  if (day === 0 || day === 6) {
    return 'weekend';
  }

  // Time of day
  if (hour >= 5 && hour < 9) {
    return 'morning';
  } else if (hour >= 9 && hour < 18) {
    return 'work';
  } else if (hour >= 18 && hour < 23) {
    return 'evening';
  }

  // Late night/early morning - default
  return 'default';
}

/**
 * getWeights(mode)
 * ----------------
 * Gets the weight configuration for a context mode.
 *
 * @param {string} mode - Context mode
 * @returns {Object} Weight configuration
 */
export function getWeights(mode) {
  return WEIGHT_CONFIGS[mode] || WEIGHT_CONFIGS.default;
}

// =============================================================================
// INDIVIDUAL FACTOR SCORING
// =============================================================================

/**
 * getUrgencyScore(item)
 * ---------------------
 * Calculates urgency score based on due date proximity.
 *
 * @param {Object} item - Item with optional dueDate/deadline
 * @returns {number} Score 0-100
 */
export function getUrgencyScore(item) {
  const dueDate = item.dueDate || item.deadline || item.startDate;
  if (!dueDate) return 0;

  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);

  // Overdue items
  if (hoursUntilDue < 0) {
    // More overdue = higher score, capped at 100
    const hoursOverdue = Math.abs(hoursUntilDue);
    return Math.min(100, 80 + (hoursOverdue / 24) * 5); // 80-100 based on days overdue
  }

  // Due within 1 hour
  if (hoursUntilDue <= 1) {
    return 90;
  }

  // Due within 3 hours
  if (hoursUntilDue <= 3) {
    return 80;
  }

  // Due today (within 12 hours)
  if (hoursUntilDue <= 12) {
    return 70;
  }

  // Due tomorrow (12-36 hours)
  if (hoursUntilDue <= 36) {
    return 50;
  }

  // Due this week
  if (hoursUntilDue <= 168) { // 7 days
    return 30;
  }

  // Due later
  if (hoursUntilDue <= 720) { // 30 days
    return 10;
  }

  return 0;
}

/**
 * getAttentionScore(item)
 * -----------------------
 * Calculates attention score based on whether item needs response.
 *
 * @param {Object} item - Item with attention-related properties
 * @returns {number} Score 0-100
 */
export function getAttentionScore(item) {
  let score = 0;

  // Unread messages
  if (item.unread || item.unreadCount > 0) {
    score = Math.min(100, 60 + (item.unreadCount || 1) * 10);
  }

  // Pending status (shares, invites)
  if (item.status === 'pending') {
    score = Math.max(score, 70);
  }

  // Unprocessed (inbox)
  if (item.processed === false) {
    score = Math.max(score, 50);
  }

  // Needs review/action
  if (item.needsReview || item.needsAction) {
    score = Math.max(score, 60);
  }

  return score;
}

/**
 * getRecencyScore(item)
 * ---------------------
 * Calculates recency score based on creation/modification time.
 *
 * @param {Object} item - Item with createdAt/updatedAt
 * @returns {number} Score 0-100
 */
export function getRecencyScore(item) {
  const timestamp = item.updatedAt || item.createdAt || item.lastMessageAt;
  if (!timestamp) return 0;

  const now = new Date();
  const itemDate = new Date(timestamp);
  const hoursAgo = (now - itemDate) / (1000 * 60 * 60);

  // Within last hour
  if (hoursAgo <= 1) {
    return 100;
  }

  // Within last 3 hours
  if (hoursAgo <= 3) {
    return 85;
  }

  // Within last 6 hours
  if (hoursAgo <= 6) {
    return 70;
  }

  // Within last 12 hours
  if (hoursAgo <= 12) {
    return 55;
  }

  // Within last 24 hours
  if (hoursAgo <= 24) {
    return 40;
  }

  // Within last 3 days
  if (hoursAgo <= 72) {
    return 25;
  }

  // Within last week
  if (hoursAgo <= 168) {
    return 10;
  }

  return 0;
}

/**
 * getFeatureUsageScore(itemType, usageProfile)
 * --------------------------------------------
 * Gets score based on how much the user uses this feature type.
 *
 * @param {string} itemType - Type of item (tasks, notes, projects, etc.)
 * @param {Object} usageProfile - User's feature usage percentages
 * @returns {number} Score 0-100
 */
export function getFeatureUsageScore(itemType, usageProfile) {
  if (!usageProfile || !itemType) return 50; // Default to neutral

  // Map item types to usage profile keys
  const typeMap = {
    task: 'tasks',
    note: 'notes',
    project: 'projects',
    event: 'events',
    message: 'messages',
    image: 'images',
    file: 'files'
  };

  const profileKey = typeMap[itemType] || itemType;
  const usagePercent = usageProfile[profileKey] || 0;

  // Convert percentage to score (0-100)
  // High usage (>30%) = high score
  // Low usage (<10%) = low score
  if (usagePercent >= 30) return 100;
  if (usagePercent >= 20) return 75;
  if (usagePercent >= 10) return 50;
  if (usagePercent >= 5) return 25;
  return 10;
}

/**
 * getContextBonus(item, context)
 * ------------------------------
 * Calculates bonus score based on contextual relevance.
 *
 * @param {Object} item - The item
 * @param {Object} context - Context information { mode, dayOfWeek, hour }
 * @returns {number} Score 0-100
 */
export function getContextBonus(item, context) {
  let score = 50; // Neutral starting point

  const { mode } = context;

  // Life area matching
  const workAreas = ['work', 'career', 'professional'];
  const personalAreas = ['personal', 'home', 'family', 'health', 'fitness'];

  const itemArea = (item.lifeArea?.name || item.area || '').toLowerCase();

  if (mode === 'work') {
    // Boost work-related items during work hours
    if (workAreas.some(area => itemArea.includes(area))) {
      score += 30;
    }
    // Slight penalty for personal items
    if (personalAreas.some(area => itemArea.includes(area))) {
      score -= 10;
    }
  } else if (mode === 'weekend' || mode === 'evening') {
    // Boost personal items on weekends/evenings
    if (personalAreas.some(area => itemArea.includes(area))) {
      score += 25;
    }
  }

  // Priority-based bonus
  if (item.priority === 'urgent') {
    score += 20;
  } else if (item.priority === 'high') {
    score += 10;
  }

  // Pinned items get a bonus
  if (item.pinned) {
    score += 15;
  }

  return Math.min(100, Math.max(0, score));
}

// =============================================================================
// COMBINED SCORING
// =============================================================================

/**
 * calculateItemScore(item, usageProfile, context)
 * -----------------------------------------------
 * Calculates the overall priority score for an item.
 *
 * @param {Object} item - The item to score
 * @param {Object} usageProfile - User's feature usage profile
 * @param {Object} context - Context information
 * @returns {number} Combined priority score (0-100)
 */
export function calculateItemScore(item, usageProfile, context = {}) {
  const mode = context.mode || detectContextMode();
  const weights = getWeights(mode);

  const urgency = getUrgencyScore(item);
  const attention = getAttentionScore(item);
  const recency = getRecencyScore(item);
  const featureUsage = getFeatureUsageScore(item.itemType || item.type, usageProfile);
  const contextBonus = getContextBonus(item, { ...context, mode });

  // Weighted sum
  const weightedScore = (
    (weights.urgency / 100) * urgency +
    (weights.attention / 100) * attention +
    (weights.recency / 100) * recency +
    (weights.featureUsage / 100) * featureUsage +
    (weights.context / 100) * contextBonus
  );

  return Math.round(weightedScore);
}

/**
 * calculateSectionScore(items, usageProfile, context)
 * ---------------------------------------------------
 * Calculates the overall priority score for a section/widget.
 * Used to determine which widgets to show prominently.
 *
 * @param {Array} items - Array of items in the section
 * @param {Object} usageProfile - User's feature usage profile
 * @param {Object} context - Context information
 * @returns {number} Section priority score (0-100+)
 */
export function calculateSectionScore(items, usageProfile, context = {}) {
  if (!items || items.length === 0) return 0;

  // Calculate scores for all items
  const scores = items.map(item =>
    calculateItemScore(item, usageProfile, context)
  );

  // Get top 3 scores
  const topScores = scores
    .sort((a, b) => b - a)
    .slice(0, 3);

  // Average of top 3 (or fewer if less items)
  const avgTop = topScores.reduce((sum, s) => sum + s, 0) / topScores.length;

  // Count bonus (more items = more important section)
  // Max 20 points for count
  const countBonus = Math.min(items.length * 5, 20);

  return Math.round(avgTop + countBonus);
}

/**
 * sortByPriority(items, usageProfile, context)
 * --------------------------------------------
 * Sorts items by their priority score, highest first.
 *
 * @param {Array} items - Array of items
 * @param {Object} usageProfile - User's feature usage profile
 * @param {Object} context - Context information
 * @returns {Array} Sorted items with scores attached
 */
export function sortByPriority(items, usageProfile, context = {}) {
  return items
    .map(item => ({
      ...item,
      _priorityScore: calculateItemScore(item, usageProfile, context)
    }))
    .sort((a, b) => b._priorityScore - a._priorityScore);
}

/**
 * getVisibleWidgets(allWidgets, dashboardData, usageProfile, preferences)
 * -----------------------------------------------------------------------
 * Determines which widgets to show based on priority scoring.
 *
 * @param {Array} allWidgets - All available widget definitions
 * @param {Object} dashboardData - Dashboard data from API
 * @param {Object} usageProfile - User's feature usage profile
 * @param {Object} preferences - User's dashboard preferences
 * @returns {Array} Widgets to display, sorted by priority
 */
export function getVisibleWidgets(allWidgets, dashboardData, usageProfile, preferences = {}) {
  const context = { mode: detectContextMode() };
  const { pinnedWidgets = [], hiddenWidgets = [] } = preferences;
  const pinnedIds = new Set(pinnedWidgets.map(p => p.widgetId));
  const hiddenIds = new Set(hiddenWidgets);

  // Filter out hidden widgets
  const visibleWidgets = allWidgets.filter(w => !hiddenIds.has(w.id));

  // Calculate scores for each widget
  const scoredWidgets = visibleWidgets.map(widget => {
    // Get items for this widget from dashboard data
    const items = getWidgetItems(widget.id, dashboardData);
    const score = calculateSectionScore(items, usageProfile, context);

    return {
      ...widget,
      _sectionScore: score,
      isPinned: pinnedIds.has(widget.id)
    };
  });

  // Sort: pinned first, then by score
  return scoredWidgets.sort((a, b) => {
    // Pinned widgets always come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then sort by score
    return b._sectionScore - a._sectionScore;
  });
}

/**
 * getWidgetItems(widgetId, dashboardData)
 * ---------------------------------------
 * Gets the relevant items for a widget from dashboard data.
 *
 * @param {string} widgetId - Widget identifier
 * @param {Object} dashboardData - Dashboard data from API
 * @returns {Array} Items for the widget
 */
function getWidgetItems(widgetId, dashboardData) {
  if (!dashboardData) return [];

  const mapping = {
    'tasks': [
      ...(dashboardData.urgentItems?.overdueTasks || []),
      ...(dashboardData.urgentItems?.dueTodayTasks || []),
      ...(dashboardData.tasks || [])
    ],
    'overdue': dashboardData.urgentItems?.overdueTasks || [],
    'events': [
      ...(dashboardData.events?.today || []),
      ...(dashboardData.urgentItems?.upcomingEvents || [])
    ],
    'tomorrow': dashboardData.events?.tomorrow || [],
    'projects': dashboardData.projects || [],
    'messages': dashboardData.messages || [],
    'inbox': dashboardData.inbox || [],
    'notifications': dashboardData.notifications || [],
    'shared': dashboardData.sharedItems || [],
    'activity': dashboardData.activity || [],
    'recent': [
      ...(dashboardData.recentItems?.notes || []),
      ...(dashboardData.recentItems?.tasks || []),
      ...(dashboardData.recentItems?.projects || [])
    ]
  };

  return mapping[widgetId] || [];
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  detectContextMode,
  getWeights,
  calculateItemScore,
  calculateSectionScore,
  sortByPriority,
  getVisibleWidgets,
  getUrgencyScore,
  getAttentionScore,
  getRecencyScore,
  getFeatureUsageScore,
  getContextBonus
};
