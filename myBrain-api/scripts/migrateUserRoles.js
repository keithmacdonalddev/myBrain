/**
 * Migration script to update user roles from 'user' to 'free'
 *
 * Run with: node scripts/migrateUserRoles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrateUserRoles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the users collection directly to avoid schema validation issues
    const usersCollection = mongoose.connection.db.collection('users');

    // Count users with old 'user' role
    const userCount = await usersCollection.countDocuments({ role: 'user' });
    console.log(`Found ${userCount} users with role 'user' to migrate`);

    if (userCount > 0) {
      // Update all users with role 'user' to 'free'
      const result = await usersCollection.updateMany(
        { role: 'user' },
        { $set: { role: 'free' } }
      );

      console.log(`Successfully migrated ${result.modifiedCount} users from 'user' to 'free' role`);
    } else {
      console.log('No users to migrate');
    }

    // Show current role distribution
    const roleDistribution = await usersCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\nCurrent role distribution:');
    roleDistribution.forEach(r => {
      console.log(`  ${r._id}: ${r.count} users`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

migrateUserRoles();
