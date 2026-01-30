/**
 * =============================================================================
 * VERIFY TEST DATA SCRIPT
 * =============================================================================
 *
 * This script verifies that all test data was properly set up:
 * - Passwords are set for test accounts
 * - Profiles have firstName, lastName, displayName, and bio
 * - Connections exist between test users
 *
 * RUN: cd myBrain-api && node scripts/verifyTestData.js
 * =============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    // Core test emails we should have profiles for
    const coreTestEmails = [
      'claude-test-user@mybrain.test',
      'claude-test-admin@mybrain.test',
      'aisha-test@mybrain.test',
      'alex-test@mybrain.test',
      'emma-test@mybrain.test',
      'james-test@mybrain.test',
      'jordan-test@mybrain.test',
      'marcus-test@mybrain.test',
      'olivia-test@mybrain.test',
      'sofia-test@mybrain.test'
    ];

    // 1. Check passwords are set
    console.log('=== PASSWORD VERIFICATION ===');
    const usersWithPasswords = await mongoose.connection.db.collection('users')
      .find({
        email: { $in: coreTestEmails },
        passwordHash: { $exists: true, $ne: null }
      })
      .project({ email: 1 })
      .toArray();

    console.log(`Accounts with passwords: ${usersWithPasswords.length}/${coreTestEmails.length}`);
    if (usersWithPasswords.length === coreTestEmails.length) {
      console.log('PASS: All core test accounts have passwords set\n');
    } else {
      console.log('FAIL: Some accounts missing passwords\n');
    }

    // 2. Check profiles are populated
    console.log('=== PROFILE VERIFICATION ===');
    const profiles = await mongoose.connection.db.collection('users')
      .find({ email: { $in: coreTestEmails } })
      .project({
        email: 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        'profile.displayName': 1,
        'profile.bio': 1
      })
      .toArray();

    let profilesComplete = 0;
    profiles.forEach(u => {
      const hasProfile = u.profile?.firstName && u.profile?.lastName && u.profile?.displayName && u.profile?.bio;
      if (hasProfile) profilesComplete++;
      console.log(`  ${u.email}: ${u.profile?.displayName || 'NO NAME'}`);
    });
    console.log(`\nProfiles complete: ${profilesComplete}/${coreTestEmails.length}`);
    if (profilesComplete === coreTestEmails.length) {
      console.log('PASS: All core test accounts have complete profiles\n');
    } else {
      console.log('FAIL: Some profiles incomplete\n');
    }

    // 3. Check connections exist
    console.log('=== CONNECTIONS VERIFICATION ===');
    const totalConnections = await mongoose.connection.db.collection('connections')
      .countDocuments({ status: 'accepted' });

    console.log(`Total accepted connections in database: ${totalConnections}`);

    // Check specifically between core test users
    const coreUsers = await mongoose.connection.db.collection('users')
      .find({ email: { $in: coreTestEmails } })
      .project({ _id: 1 })
      .toArray();

    const coreUserIds = coreUsers.map(u => u._id);

    const coreConnections = await mongoose.connection.db.collection('connections')
      .countDocuments({
        requesterId: { $in: coreUserIds },
        addresseeId: { $in: coreUserIds },
        status: 'accepted'
      });

    // Expected: n*(n-1)/2 where n = number of core users = 10, so 45 connections
    const expectedConnections = (coreTestEmails.length * (coreTestEmails.length - 1)) / 2;
    console.log(`Connections between core test users: ${coreConnections}/${expectedConnections}`);

    if (coreConnections >= expectedConnections) {
      console.log('PASS: Core test users are fully connected\n');
    } else {
      console.log('PARTIAL: Some connections between core users may be missing\n');
    }

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Passwords set: ${usersWithPasswords.length === coreTestEmails.length ? 'YES' : 'NO'}`);
    console.log(`Profiles complete: ${profilesComplete === coreTestEmails.length ? 'YES' : 'NO'}`);
    console.log(`Connections created: ${coreConnections >= expectedConnections ? 'YES' : 'PARTIAL'}`);

  } catch (error) {
    console.error('Verification error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

verify();
