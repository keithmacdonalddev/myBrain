/**
 * One-time script to promote a user to admin
 * Usage: node scripts/makeAdmin.js user@example.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/makeAdmin.js <email>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.error(`User with email "${email}" not found`);
    } else if (result.modifiedCount === 0) {
      console.log(`User "${email}" is already an admin`);
    } else {
      console.log(`Successfully promoted "${email}" to admin!`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

makeAdmin();
