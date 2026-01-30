/**
 * =============================================================================
 * CLEANUP E2E TEST ACCOUNTS SCRIPT
 * =============================================================================
 *
 * This script cleans up leftover e2e-test-* accounts that were created during
 * automated E2E testing but not properly deleted during teardown.
 *
 * These accounts follow the pattern: e2e-test-{timestamp}@mybrain.test
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Finds all users with email matching: e2e-test-\d+@mybrain.test
 * 2. Deletes all their associated content (notes, tasks, projects)
 * 3. Deletes the user accounts themselves
 *
 * RUN: cd myBrain-api && node scripts/cleanupE2EAccounts.js
 *
 * SAFETY: This script only targets e2e-test-* accounts (numeric timestamp IDs).
 * It does NOT affect:
 * - Real user accounts
 * - Named test accounts (claude-test-user, alex-test, etc.)
 * =============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function cleanupE2EAccounts() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // Find e2e-test-* accounts (those with numeric timestamps in the name)
    // Pattern: e2e-test-{digits}@mybrain.test
    const usersToDelete = await mongoose.connection.db.collection('users').find({
      email: { $regex: /^e2e-test-\d+@mybrain\.test$/ }
    }).toArray();

    if (usersToDelete.length === 0) {
      console.log('No e2e-test-* accounts found to clean up.');
      console.log('Database is already clean.');
      await mongoose.disconnect();
      console.log('\nDisconnected from MongoDB.');
      return;
    }

    // Get the user IDs for deletion
    const deletedUserIds = usersToDelete.map(u => u._id);
    console.log(`Found ${usersToDelete.length} e2e-test accounts to delete:`);
    usersToDelete.forEach(u => console.log(`  - ${u.email}`));
    console.log('');

    // Delete user content first (to avoid orphaned data)
    console.log('Deleting associated content...');

    // Delete notes
    const notesResult = await mongoose.connection.db.collection('notes').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${notesResult.deletedCount} notes`);

    // Delete tasks
    const tasksResult = await mongoose.connection.db.collection('tasks').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${tasksResult.deletedCount} tasks`);

    // Delete projects
    const projectsResult = await mongoose.connection.db.collection('projects').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${projectsResult.deletedCount} projects`);

    // Delete events
    const eventsResult = await mongoose.connection.db.collection('events').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${eventsResult.deletedCount} events`);

    // Delete tags
    const tagsResult = await mongoose.connection.db.collection('tags').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${tagsResult.deletedCount} tags`);

    // Delete connections involving these users
    const connectionsResult = await mongoose.connection.db.collection('connections').deleteMany({
      $or: [
        { requesterId: { $in: deletedUserIds } },
        { addresseeId: { $in: deletedUserIds } }
      ]
    });
    console.log(`  - Deleted ${connectionsResult.deletedCount} connections`);

    // Delete messages from these users
    const messagesResult = await mongoose.connection.db.collection('messages').deleteMany({
      senderId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${messagesResult.deletedCount} messages`);

    // Delete conversations involving these users
    const conversationsResult = await mongoose.connection.db.collection('conversations').deleteMany({
      participantIds: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${conversationsResult.deletedCount} conversations`);

    // Delete notifications
    const notificationsResult = await mongoose.connection.db.collection('notifications').deleteMany({
      userId: { $in: deletedUserIds }
    });
    console.log(`  - Deleted ${notificationsResult.deletedCount} notifications`);

    // Finally, delete the user accounts
    console.log('\nDeleting user accounts...');
    const usersResult = await mongoose.connection.db.collection('users').deleteMany({
      _id: { $in: deletedUserIds }
    });

    console.log(`\n========================================`);
    console.log(`CLEANUP COMPLETE`);
    console.log(`========================================`);
    console.log(`Deleted ${usersResult.deletedCount} e2e-test user accounts`);
    console.log(`Total content deleted:`);
    console.log(`  - ${notesResult.deletedCount} notes`);
    console.log(`  - ${tasksResult.deletedCount} tasks`);
    console.log(`  - ${projectsResult.deletedCount} projects`);
    console.log(`  - ${eventsResult.deletedCount} events`);
    console.log(`  - ${tagsResult.deletedCount} tags`);
    console.log(`  - ${connectionsResult.deletedCount} connections`);
    console.log(`  - ${messagesResult.deletedCount} messages`);
    console.log(`  - ${conversationsResult.deletedCount} conversations`);
    console.log(`  - ${notificationsResult.deletedCount} notifications`);

  } catch (error) {
    console.error('Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    // Always disconnect from the database
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the script
cleanupE2EAccounts();
