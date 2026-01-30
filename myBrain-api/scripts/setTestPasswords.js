/**
 * =============================================================================
 * SET TEST PASSWORDS SCRIPT
 * =============================================================================
 *
 * This script sets passwords for all test accounts that were created without
 * password hashes. This enables login for testing purposes.
 *
 * RUN: cd myBrain-api && node scripts/setTestPasswords.js
 *
 * Test accounts will be able to log in with password: ClaudeTest123
 * =============================================================================
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function setTestPasswords() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // Hash the test password (10 rounds is standard security)
    const password = await bcrypt.hash('ClaudeTest123', 10);

    // List of test account emails that need passwords
    const testEmails = [
      'aisha-test@mybrain.test',
      'alex-test@mybrain.test',
      'emma-test@mybrain.test',
      'james-test@mybrain.test',
      'jordan-test@mybrain.test',
      'marcus-test@mybrain.test',
      'olivia-test@mybrain.test',
      'sofia-test@mybrain.test',
    ];

    console.log(`Setting passwords for ${testEmails.length} test accounts...`);

    // Update all test accounts with the hashed password
    const result = await mongoose.connection.db.collection('users').updateMany(
      { email: { $in: testEmails } },
      { $set: { passwordHash: password } }
    );

    console.log(`\nResults:`);
    console.log(`- Matched: ${result.matchedCount} accounts`);
    console.log(`- Updated: ${result.modifiedCount} accounts`);

    if (result.matchedCount === 0) {
      console.log('\nWARNING: No accounts were found. Make sure test accounts exist in the database.');
    } else if (result.modifiedCount < result.matchedCount) {
      console.log(`\nNote: ${result.matchedCount - result.modifiedCount} accounts already had passwords set.`);
    }

    console.log('\nAll test accounts can now log in with password: ClaudeTest123');

  } catch (error) {
    console.error('Error setting passwords:', error.message);
    process.exit(1);
  } finally {
    // Always disconnect from the database
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the script
setTestPasswords();
