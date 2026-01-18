/**
 * Migration script to add default categories to existing users
 *
 * This script will:
 * 1. Find all users who only have the old "Uncategorized" default category
 * 2. Replace it with the new comprehensive default categories
 * 3. Reassign any items from the old category to "Work & Career"
 *
 * Run with: node scripts/migrateDefaultCategories.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Default categories to create for users
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

async function migrateDefaultCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const usersCollection = mongoose.connection.db.collection('users');
    const lifeAreasCollection = mongoose.connection.db.collection('lifeareas');
    const notesCollection = mongoose.connection.db.collection('notes');
    const tasksCollection = mongoose.connection.db.collection('tasks');
    const eventsCollection = mongoose.connection.db.collection('events');
    const projectsCollection = mongoose.connection.db.collection('projects');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to check\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const userId = user._id;

      // Get user's current categories
      const userCategories = await lifeAreasCollection.find({ userId }).toArray();

      // Check if user only has the old "Uncategorized" default or no categories
      const hasOnlyUncategorized = userCategories.length === 1 &&
        userCategories[0].name === 'Uncategorized';
      const hasNoCategories = userCategories.length === 0;

      // Check if user already has the new categories
      const hasNewCategories = userCategories.some(c => c.name === 'Work & Career');

      if (hasNewCategories) {
        console.log(`  [SKIP] ${user.email} - Already has new categories`);
        skippedCount++;
        continue;
      }

      if (hasOnlyUncategorized || hasNoCategories) {
        console.log(`  [MIGRATE] ${user.email} - ${hasNoCategories ? 'No categories' : 'Only Uncategorized'}`);

        const oldCategoryId = hasOnlyUncategorized ? userCategories[0]._id : null;

        // Create new categories for user
        const newCategories = DEFAULT_CATEGORIES.map(cat => ({
          ...cat,
          userId,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const insertResult = await lifeAreasCollection.insertMany(newCategories);
        const newDefaultCategoryId = insertResult.insertedIds[0]; // Work & Career (first one)

        // If user had the old Uncategorized category, migrate items and delete it
        if (oldCategoryId) {
          // Reassign items to the new default category
          const [notesUpdated, tasksUpdated, eventsUpdated, projectsUpdated] = await Promise.all([
            notesCollection.updateMany(
              { userId, lifeAreaId: oldCategoryId },
              { $set: { lifeAreaId: newDefaultCategoryId } }
            ),
            tasksCollection.updateMany(
              { userId, lifeAreaId: oldCategoryId },
              { $set: { lifeAreaId: newDefaultCategoryId } }
            ),
            eventsCollection.updateMany(
              { userId, lifeAreaId: oldCategoryId },
              { $set: { lifeAreaId: newDefaultCategoryId } }
            ),
            projectsCollection.updateMany(
              { userId, lifeAreaId: oldCategoryId },
              { $set: { lifeAreaId: newDefaultCategoryId } }
            )
          ]);

          const totalMoved = notesUpdated.modifiedCount + tasksUpdated.modifiedCount +
                            eventsUpdated.modifiedCount + projectsUpdated.modifiedCount;

          if (totalMoved > 0) {
            console.log(`           Moved ${totalMoved} items to Work & Career`);
          }

          // Delete old Uncategorized category
          await lifeAreasCollection.deleteOne({ _id: oldCategoryId });
          console.log(`           Deleted old Uncategorized category`);
        }

        console.log(`           Created ${newCategories.length} new categories`);
        migratedCount++;
      } else {
        // User has custom categories - add the new defaults without the isDefault flag
        console.log(`  [ADD] ${user.email} - Has ${userCategories.length} custom categories, adding defaults`);

        // Get max order
        const maxOrder = Math.max(...userCategories.map(c => c.order || 0), -1);

        // Add new categories that don't already exist (by name)
        const existingNames = new Set(userCategories.map(c => c.name.toLowerCase()));
        const categoriesToAdd = DEFAULT_CATEGORIES
          .filter(cat => !existingNames.has(cat.name.toLowerCase()))
          .map((cat, index) => ({
            ...cat,
            userId,
            isDefault: false, // Don't override their existing default
            order: maxOrder + 1 + index,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

        if (categoriesToAdd.length > 0) {
          await lifeAreasCollection.insertMany(categoriesToAdd);
          console.log(`           Added ${categoriesToAdd.length} new categories`);
        } else {
          console.log(`           All default categories already exist`);
        }

        migratedCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`  Total users: ${users.length}`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped (already migrated): ${skippedCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

migrateDefaultCategories();
