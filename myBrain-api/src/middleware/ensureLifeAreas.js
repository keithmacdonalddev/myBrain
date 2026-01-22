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
 * ensureLifeAreas(req, res, next) - Create Default Life Areas for New Users
 * ===========================================================================
 * This middleware automatically creates default life areas (categories) for
 * new users the first time they access the app. It ensures users don't start
 * with a blank, confusing interface.
 *
 * WHAT ARE LIFE AREAS?
 * -------------------
 * Life areas (also called "life categories" or "areas of life") are ongoing
 * domains of responsibility in your life. Unlike projects (which have an end),
 * life areas are continuous and never finish.
 *
 * Examples of life areas:
 * - Work & Career: Your job, professional development
 * - Health & Fitness: Physical and mental wellbeing
 * - Finance: Money, investments, budgeting
 * - Family & Relationships: Time with loved ones
 * - Personal Growth: Learning, hobbies, self-improvement
 * - Home & Living: House maintenance, living space
 *
 * WHY PROVIDE DEFAULTS?
 * --------------------
 * 1. BETTER NEW USER EXPERIENCE
 *    - Users don't start with empty app (confusing)
 *    - Defaults show what's possible
 *    - Users can immediately start organizing

 * 2. GUIDANCE
 *    - Shows users how to structure their life
 *    - Follows proven productivity frameworks
 *    - Balanced coverage of life areas
 *
 * 3. ORGANIZATION
 *    - Users can immediately organize content
 *    - Don't have to create categories first
 *    - Reduces friction to getting started
 *
 * MIDDLEWARE BEHAVIOR:
 * -------------------
 * - If user has NO life areas → Create all 6 defaults
 * - If user has ANY life areas → Do nothing (leave them alone)
 * - If creation fails → Log error but continue (don't block user)
 *
 * This approach:
 * - Respects users who delete defaults (don't recreate)
 * - Helps new users get started (provides defaults)
 * - Fails gracefully (user can still use app without defaults)
 *
 * @param {Request} req - Express request object
 *   - MUST have req.user (set by requireAuth middleware)
 *   - req.user._id: The user's ID
 *
 * @param {Response} res - Express response object
 *
 * @param {Function} next - Express next function
 *   - Always called (never blocks request)
 *
 * PREREQUISITE:
 * - Must run AFTER requireAuth middleware
 * - req.user must be set (middleware checks for this)
 *
 * ERROR HANDLING:
 * - Database errors are caught and logged
 * - Request continues anyway (user can use app without defaults)
 * - Better to have user without defaults than broken app
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Apply to routes that need life areas
 * router.get('/dashboard',
 *   requireAuth,         // User must be logged in
 *   ensureLifeAreas,     // User gets default categories
 *   getDashboard         // Route handler
 * );
 *
 * // Or apply globally for all authenticated routes
 * app.use(requireAuth);
 * app.use(ensureLifeAreas);  // All logged-in users get defaults
 * ```
 *
 * WHAT HAPPENS:
 * 1. New user logs in
 * 2. Middleware checks: Does user have any life areas?
 * 3. Answer: No (new user)
 * 4. Middleware creates all 6 default categories for them
 * 5. User sees organized dashboard with categories
 *
 * Later, if user creates more or deletes defaults:
 * 1. Middleware runs again
 * 2. Checks: Does user have any life areas?
 * 3. Answer: Yes (they have what they created)
 * 4. Middleware does nothing (respects user's choices)
 */
export async function ensureLifeAreas(req, res, next) {
  try {
    // =========================================================================
    // CHECK: IS USER AUTHENTICATED?
    // =========================================================================
    // This middleware should only run after requireAuth
    // If req.user is missing, something is wrong with the middleware chain

    if (!req.user) {
      return next();  // Skip this middleware
    }

    // =========================================================================
    // CHECK: DOES USER HAVE ANY LIFE AREAS?
    // =========================================================================
    // Count how many life areas (categories) this user has created
    // Using countDocuments is efficient - just returns a number

    const count = await LifeArea.countDocuments({ userId: req.user._id });

    // =========================================================================
    // CREATE DEFAULTS ONLY IF USER HAS ZERO LIFE AREAS
    // =========================================================================
    // This logic:
    // - Provides defaults for NEW users (count === 0)
    // - Respects user choices (if they delete defaults, don't recreate)
    // - Doesn't duplicate defaults (if they already have some)

    if (count === 0) {
      // =========================================================================
      // PREPARE DEFAULT CATEGORIES
      // =========================================================================
      // Take the DEFAULT_CATEGORIES configuration and add the user's ID to each
      // So MongoDB knows which user owns these categories

      const categories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,                    // Copy name, description, color, icon, etc.
        userId: req.user._id       // Add user ID so categories belong to this user
      }));

      // =========================================================================
      // INSERT ALL CATEGORIES AT ONCE
      // =========================================================================
      // Use insertMany() instead of create() one-by-one
      // Benefits:
      // - More efficient (single database operation)
      // - Atomic (either all created or none)
      // - Faster for bulk operations

      await LifeArea.insertMany(categories);

      // Optional: Uncomment to log when defaults are created
      // console.log(`Created ${categories.length} default life areas for user ${req.user._id}`);
    }

    // =========================================================================
    // CONTINUE TO NEXT MIDDLEWARE/ROUTE
    // =========================================================================
    // Whether we created defaults or not, continue
    // This middleware never blocks requests

    next();

  } catch (error) {
    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    // If anything goes wrong (database error, etc.):
    // 1. Log it (so we know there's a problem)
    // 2. Continue anyway (don't break the app for the user)
    //
    // It's better for user to have no defaults than for the entire
    // app to fail because of a logging/setup error.

    console.error('Error ensuring life areas:', error);

    // Don't block the request
    // User can still use the app without defaults
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
