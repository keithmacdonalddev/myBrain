/**
 * =============================================================================
 * POPULATE TEST PROFILES SCRIPT
 * =============================================================================
 *
 * This script populates profile data (firstName, lastName, displayName, bio)
 * for all test accounts. This makes the social features display properly with
 * real-looking user data instead of empty profiles.
 *
 * RUN: cd myBrain-api && node scripts/populateTestProfiles.js
 *
 * After running, test accounts will have complete profile information.
 * =============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Profile data for each test account
// The profile fields are nested under profile: { firstName, lastName, displayName, bio }
const profiles = [
  {
    email: 'claude-test-user@mybrain.test',
    firstName: 'Alex',
    lastName: 'Chen',
    displayName: 'Alex Chen',
    bio: 'Software developer and productivity enthusiast'
  },
  {
    email: 'claude-test-admin@mybrain.test',
    firstName: 'Jordan',
    lastName: 'Smith',
    displayName: 'Jordan Smith',
    bio: 'Platform administrator'
  },
  {
    email: 'aisha-test@mybrain.test',
    firstName: 'Aisha',
    lastName: 'Patel',
    displayName: 'Aisha Patel',
    bio: 'Data scientist exploring AI applications'
  },
  {
    email: 'alex-test@mybrain.test',
    firstName: 'Alex',
    lastName: 'Rodriguez',
    displayName: 'Alex Rodriguez',
    bio: 'Full-stack developer'
  },
  {
    email: 'emma-test@mybrain.test',
    firstName: 'Emma',
    lastName: 'Rodriguez',
    displayName: 'Emma Rodriguez',
    bio: 'Startup founder building the future'
  },
  {
    email: 'james-test@mybrain.test',
    firstName: 'James',
    lastName: 'Wilson',
    displayName: 'James Wilson',
    bio: 'Project manager and team lead'
  },
  {
    email: 'jordan-test@mybrain.test',
    firstName: 'Jordan',
    lastName: 'Lee',
    displayName: 'Jordan Lee',
    bio: 'UX designer passionate about accessibility'
  },
  {
    email: 'marcus-test@mybrain.test',
    firstName: 'Marcus',
    lastName: 'Johnson',
    displayName: 'Marcus Johnson',
    bio: 'DevOps engineer automating everything'
  },
  {
    email: 'olivia-test@mybrain.test',
    firstName: 'Olivia',
    lastName: 'Martinez',
    displayName: 'Olivia Martinez',
    bio: 'Content strategist and writer'
  },
  {
    email: 'sofia-test@mybrain.test',
    firstName: 'Sofia',
    lastName: 'Kim',
    displayName: 'Sofia Kim',
    bio: 'Graphic designer and illustrator'
  },
];

async function populateTestProfiles() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.\n');

    console.log(`Updating ${profiles.length} test account profiles...\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update each profile one by one
    for (const profile of profiles) {
      const result = await mongoose.connection.db.collection('users').updateOne(
        { email: profile.email },
        {
          $set: {
            'profile.firstName': profile.firstName,
            'profile.lastName': profile.lastName,
            'profile.displayName': profile.displayName,
            'profile.bio': profile.bio
          }
        }
      );

      if (result.matchedCount > 0) {
        console.log(`  Updated: ${profile.email} -> ${profile.displayName}`);
        updatedCount++;
      } else {
        console.log(`  NOT FOUND: ${profile.email}`);
        notFoundCount++;
      }
    }

    console.log(`\nResults:`);
    console.log(`- Updated: ${updatedCount} profiles`);
    if (notFoundCount > 0) {
      console.log(`- Not found: ${notFoundCount} accounts (may not exist in database)`);
    }

    console.log('\nTest accounts now have complete profile information!');

  } catch (error) {
    console.error('Error populating profiles:', error.message);
    process.exit(1);
  } finally {
    // Always disconnect from the database
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the script
populateTestProfiles();
