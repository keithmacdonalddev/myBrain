/**
 * =============================================================================
 * ENSURELIFEAREAS.JS - Default Life Areas Setup Middleware
 * =============================================================================
 *
 * This file provides middleware that ensures every user has default life areas
 * (categories) set up when they first use the application.
 *
 * WHAT ARE LIFE AREAS?
 * --------------------
 * Life areas (also called categories) are ongoing areas of responsibility
 * in a person's life. Unlike projects (which have an end), life areas are
 * continuous. Examples:
 * - Work & Career
 * - Health & Fitness
 * - Family & Relationships
 * - Personal Growth
 *
 * WHY PROVIDE DEFAULTS?
 * ---------------------
 * 1. NEW USER EXPERIENCE: Users don't start with an empty, confusing app
 * 2. GUIDANCE: Defaults teach users how to use categories
 * 3. ORGANIZATION: Users can immediately start organizing their content
 * 4. BEST PRACTICES: Defaults follow productivity methodology patterns
 *
 * HOW IT WORKS:
 * -------------
 * 1. Middleware runs after authentication (user is logged in)
 * 2. Check if user has ANY life areas
 * 3. If count is 0, create the default set
 * 4. Continue to the next middleware/route
 *
 * WHEN THIS RUNS:
 * ---------------
 * This middleware should run on routes where users might need categories,
 * typically after requireAuth middleware. It only creates defaults ONCE -
 * the first time a new user accesses the app.
 *
 * DEFAULT CATEGORIES:
 * -------------------
 * We provide 6 balanced categories covering most aspects of life:
 * 1. Work & Career - Professional responsibilities
 * 2. Health & Fitness - Physical and mental wellbeing
 * 3. Finance - Money management
 * 4. Family & Relationships - Social connections
 * 5. Personal Growth - Learning and self-improvement
 * 6. Home & Living - Household management
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * LifeArea model represents a category/life area in the database.
 */
import LifeArea from '../models/LifeArea.js';

// =============================================================================
// DEFAULT CATEGORIES CONFIGURATION
// =============================================================================

/**
 * DEFAULT_CATEGORIES
 * ------------------
 * The default categories created for new users.
 * Each category includes:
 * - name: Display name
 * - description: Helpful explanation of what belongs here
 * - color: Hex color for visual distinction
 * - icon: Icon name from Lucide icons library
 * - order: Position in the list (lower = higher up)
 * - isDefault: First category (Work) is marked as default
 */
const DEFAULT_CATEGORIES = [
  {
    name: 'Work & Career',
    description: 'Professional responsibilities, projects, meetings, and career development goals',
    color: '#3b82f6', // Blue - professional, trustworthy
    icon: 'Briefcase',
    order: 0,
    isDefault: true // This will be the default category for new items
  },
  {
    name: 'Health & Fitness',
    description: 'Physical and mental wellbeing, exercise routines, medical appointments, and health goals',
    color: '#10b981', // Green - growth, health, vitality
    icon: 'Heart',
    order: 1
  },
  {
    name: 'Finance',
    description: 'Budgeting, investments, bills, financial planning, and money management',
    color: '#f59e0b', // Amber - value, money, attention
    icon: 'DollarSign',
    order: 2
  },
  {
    name: 'Family & Relationships',
    description: 'Time with loved ones, family events, relationship maintenance, and social connections',
    color: '#ec4899', // Pink - love, warmth, connection
    icon: 'Users',
    order: 3
  },
  {
    name: 'Personal Growth',
    description: 'Learning, hobbies, self-improvement, skill development, and personal projects',
    color: '#8b5cf6', // Purple - wisdom, creativity, growth
    icon: 'Book',
    order: 4
  },
  {
    name: 'Home & Living',
    description: 'Household maintenance, chores, home improvement, and living space organization',
    color: '#6366f1', // Indigo - stability, home, comfort
    icon: 'Home',
    order: 5
  }
];

// =============================================================================
// ENSURE LIFE AREAS MIDDLEWARE
// =============================================================================

/**
 * ensureLifeAreas(req, res, next)
 * -------------------------------
 * Middleware that ensures the user has at least the default categories.
 *
 * @param {Request} req - Express request object (must have req.user)
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * PREREQUISITES:
 * - Must run AFTER requireAuth middleware (needs req.user)
 *
 * BEHAVIOR:
 * - If user has no categories → create all defaults
 * - If user has categories → do nothing (even if they deleted some defaults)
 * - On error → log and continue (don't block the request)
 *
 * WHY NOT BLOCK ON ERROR?
 * If category creation fails, the user can still use the app.
 * They just won't have default categories. Better than a broken app!
 *
 * EXAMPLE USAGE:
 * router.get('/dashboard', requireAuth, ensureLifeAreas, getDashboard);
 */
export async function ensureLifeAreas(req, res, next) {
  try {
    // Skip if no user (shouldn't happen if used after requireAuth)
    if (!req.user) {
      return next();
    }

    // Check if user has ANY categories
    const count = await LifeArea.countDocuments({ userId: req.user._id });

    // Only create defaults if user has ZERO categories
    // This means:
    // - New users get defaults
    // - Users who deleted all their categories get nothing (their choice)
    // - Users with any categories are left alone
    if (count === 0) {
      // Create default categories for this user
      // Map each default to include the user's ID
      const categories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        userId: req.user._id
      }));

      // Insert all categories at once (more efficient than individual saves)
      await LifeArea.insertMany(categories);

      // Optional: Log for debugging
      // console.log(`Created ${categories.length} default categories for user ${req.user._id}`);
    }

    // Continue to the next middleware/route
    next();
  } catch (error) {
    // Log the error for debugging
    console.error('Error ensuring categories:', error);

    // DON'T block the request if this fails
    // The user can still use the app, just without defaults
    next();
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export the middleware.
 *
 * USAGE:
 * import ensureLifeAreas from './middleware/ensureLifeAreas.js';
 *
 * // Apply to routes that need categories
 * router.use(requireAuth, ensureLifeAreas);
 *
 * // Or apply to specific routes
 * router.get('/areas', requireAuth, ensureLifeAreas, getAreas);
 */
export default ensureLifeAreas;
