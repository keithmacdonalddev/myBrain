/**
 * Migration script to add default tags to existing users
 *
 * This script will add a comprehensive set of useful tags to all users.
 * Tags that already exist for a user will be skipped.
 *
 * Run with: node scripts/migrateDefaultTags.js
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
 * Default tags organized by purpose
 * Each tag includes a color for visual distinction
 */
const DEFAULT_TAGS = [
  // Priority & Status (Red/Orange spectrum)
  { name: 'urgent', color: '#ef4444' },         // Red
  { name: 'important', color: '#f97316' },      // Orange
  { name: 'blocked', color: '#dc2626' },        // Dark red
  { name: 'in-progress', color: '#eab308' },    // Yellow
  { name: 'review', color: '#f59e0b' },         // Amber
  { name: 'done', color: '#22c55e' },           // Green

  // Time-related (Blue spectrum)
  { name: 'today', color: '#3b82f6' },          // Blue
  { name: 'this-week', color: '#6366f1' },      // Indigo
  { name: 'someday', color: '#8b5cf6' },        // Purple
  { name: 'recurring', color: '#a855f7' },      // Violet
  { name: 'deadline', color: '#ec4899' },       // Pink

  // Work & Productivity (Teal/Cyan spectrum)
  { name: 'meeting', color: '#14b8a6' },        // Teal
  { name: 'follow-up', color: '#06b6d4' },      // Cyan
  { name: 'client', color: '#0891b2' },         // Dark cyan
  { name: 'project', color: '#0d9488' },        // Dark teal
  { name: 'email', color: '#2dd4bf' },          // Light teal

  // Content & Ideas (Green spectrum)
  { name: 'idea', color: '#84cc16' },           // Lime
  { name: 'research', color: '#22c55e' },       // Green
  { name: 'reference', color: '#10b981' },      // Emerald
  { name: 'draft', color: '#34d399' },          // Light emerald
  { name: 'template', color: '#4ade80' },       // Light green

  // Personal & Goals (Purple/Pink spectrum)
  { name: 'goal', color: '#d946ef' },           // Fuchsia
  { name: 'reminder', color: '#c026d3' },       // Magenta
  { name: 'habit', color: '#a21caf' },          // Dark magenta
  { name: 'learning', color: '#9333ea' },       // Purple
  { name: 'personal', color: '#7c3aed' },       // Violet

  // Organization (Gray/Neutral spectrum)
  { name: 'archive', color: '#6b7280' },        // Gray
  { name: 'later', color: '#9ca3af' },          // Light gray
  { name: 'maybe', color: '#a3a3a3' },          // Neutral
  { name: 'waiting', color: '#78716c' },        // Stone
  { name: 'delegated', color: '#71717a' },      // Zinc
];

async function migrateDefaultTags() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const usersCollection = mongoose.connection.db.collection('users');
    const tagsCollection = mongoose.connection.db.collection('tags');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to update\n`);

    let totalTagsAdded = 0;

    for (const user of users) {
      const userId = user._id;

      // Get user's existing tags
      const existingTags = await tagsCollection.find({ userId }).toArray();
      const existingTagNames = new Set(existingTags.map(t => t.name.toLowerCase()));

      // Filter out tags that already exist
      const tagsToAdd = DEFAULT_TAGS.filter(t => !existingTagNames.has(t.name.toLowerCase()));

      if (tagsToAdd.length === 0) {
        console.log(`  [SKIP] ${user.email} - Already has all default tags`);
        continue;
      }

      // Create new tags for user
      const newTags = tagsToAdd.map(tag => ({
        userId,
        name: tag.name.toLowerCase(),
        color: tag.color,
        usageCount: 0,
        isActive: true,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await tagsCollection.insertMany(newTags);
      totalTagsAdded += newTags.length;

      console.log(`  [ADD] ${user.email} - Added ${newTags.length} tags (had ${existingTags.length} existing)`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`  Total users: ${users.length}`);
    console.log(`  Total tags added: ${totalTagsAdded}`);
    console.log(`  Default tags available: ${DEFAULT_TAGS.length}`);
    console.log('='.repeat(50));

    // Show the default tags that were added
    console.log('\nDefault tags added:');
    DEFAULT_TAGS.forEach(t => console.log(`  - ${t.name}`));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

migrateDefaultTags();
