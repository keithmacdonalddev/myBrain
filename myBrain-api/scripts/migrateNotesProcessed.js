/**
 * Migration Script: Mark existing notes as processed
 *
 * This script marks all existing notes as processed so they don't
 * appear in the inbox. Run this once after deploying the Working Memory Layer.
 *
 * Usage:
 *   cd myBrain-api
 *   node scripts/migrateNotesProcessed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error('Error: MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Get the Note collection
    const Note = mongoose.connection.collection('notes');

    // Count notes without processed field
    const unprocessedCount = await Note.countDocuments({
      processed: { $exists: false }
    });

    console.log(`Found ${unprocessedCount} notes without processed field`);

    if (unprocessedCount === 0) {
      console.log('No migration needed. All notes already have processed field.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Update all notes without processed field to have processed: true
    console.log('Marking all existing notes as processed...');

    const result = await Note.updateMany(
      { processed: { $exists: false } },
      { $set: { processed: true } }
    );

    console.log(`Migration complete! Updated ${result.modifiedCount} notes.`);

    await mongoose.connection.close();
    console.log('Database connection closed.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
