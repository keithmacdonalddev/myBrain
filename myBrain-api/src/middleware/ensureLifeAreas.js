import LifeArea from '../models/LifeArea.js';

/**
 * Default categories to create for new users
 * Each category represents an ongoing area of responsibility
 */
const DEFAULT_CATEGORIES = [
  {
    name: 'Work & Career',
    description: 'Professional responsibilities, projects, meetings, and career development goals',
    color: '#3b82f6', // Blue
    icon: 'Briefcase',
    order: 0,
    isDefault: true
  },
  {
    name: 'Health & Fitness',
    description: 'Physical and mental wellbeing, exercise routines, medical appointments, and health goals',
    color: '#10b981', // Green
    icon: 'Heart',
    order: 1
  },
  {
    name: 'Finance',
    description: 'Budgeting, investments, bills, financial planning, and money management',
    color: '#f59e0b', // Amber
    icon: 'DollarSign',
    order: 2
  },
  {
    name: 'Family & Relationships',
    description: 'Time with loved ones, family events, relationship maintenance, and social connections',
    color: '#ec4899', // Pink
    icon: 'Users',
    order: 3
  },
  {
    name: 'Personal Growth',
    description: 'Learning, hobbies, self-improvement, skill development, and personal projects',
    color: '#8b5cf6', // Purple
    icon: 'Book',
    order: 4
  },
  {
    name: 'Home & Living',
    description: 'Household maintenance, chores, home improvement, and living space organization',
    color: '#6366f1', // Indigo
    icon: 'Home',
    order: 5
  }
];

/**
 * Middleware to ensure user has at least default categories
 * Should be used after requireAuth middleware
 */
export async function ensureLifeAreas(req, res, next) {
  try {
    if (!req.user) {
      return next();
    }

    // Check if user has any categories
    const count = await LifeArea.countDocuments({ userId: req.user._id });

    if (count === 0) {
      // Create default categories for the user
      const categories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        userId: req.user._id
      }));

      await LifeArea.insertMany(categories);
    }

    next();
  } catch (error) {
    console.error('Error ensuring categories:', error);
    // Don't block the request if this fails
    next();
  }
}

export default ensureLifeAreas;
