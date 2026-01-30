/**
 * =============================================================================
 * CREATE TEST CONNECTIONS SCRIPT
 * =============================================================================
 *
 * This script creates a full mesh of social connections between all test
 * accounts. This enables testing of social features like messaging, sharing,
 * and viewing connection lists.
 *
 * RUN: cd myBrain-api && node scripts/createTestConnections.js
 *
 * After running, all @mybrain.test accounts will be connected to each other.
 * =============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function createTestConnections() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // Find all test accounts (emails ending in @mybrain.test)
    const users = await mongoose.connection.db.collection('users')
      .find({ email: /@mybrain\.test$/ })
      .toArray();

    console.log(`Found ${users.length} test accounts:`);
    users.forEach(u => console.log(`  - ${u.email}`));

    if (users.length < 2) {
      console.log('\nNeed at least 2 test accounts to create connections.');
      return;
    }

    // Build a full mesh of connections (every user connected to every other user)
    const connections = [];
    const now = new Date();

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        connections.push({
          requesterId: users[i]._id,
          addresseeId: users[j]._id,
          status: 'accepted',
          createdAt: now,
          updatedAt: now,
          acceptedAt: now
        });
      }
    }

    console.log(`\nPrepared ${connections.length} connections to create.`);

    // Remove any existing connections between test users first
    // This avoids duplicate key errors and ensures clean state
    const userIds = users.map(u => u._id);
    const deleteResult = await mongoose.connection.db.collection('connections').deleteMany({
      $or: [
        { requesterId: { $in: userIds } },
        { addresseeId: { $in: userIds } }
      ]
    });
    console.log(`Removed ${deleteResult.deletedCount} existing test connections.`);

    // Insert all new connections
    if (connections.length > 0) {
      const insertResult = await mongoose.connection.db.collection('connections').insertMany(connections);
      console.log(`Created ${insertResult.insertedCount} new connections.`);
    }

    // Update socialStats.connectionCount for each test user
    // Each user is connected to (n-1) other users where n = total test users
    const connectionCount = users.length - 1;
    const updateResult = await mongoose.connection.db.collection('users').updateMany(
      { _id: { $in: userIds } },
      { $set: { 'socialStats.connectionCount': connectionCount } }
    );
    console.log(`Updated socialStats.connectionCount to ${connectionCount} for ${updateResult.modifiedCount} users.`);

    console.log('\nAll test users are now connected to each other!');

  } catch (error) {
    console.error('Error creating connections:', error.message);
    process.exit(1);
  } finally {
    // Always disconnect from the database
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the script
createTestConnections();
