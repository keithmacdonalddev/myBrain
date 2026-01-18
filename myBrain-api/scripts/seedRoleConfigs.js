#!/usr/bin/env node

/**
 * Seed Role Configurations
 * Creates default role configs for free, premium, and admin roles
 *
 * Usage: node scripts/seedRoleConfigs.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RoleConfig, { getDefaultConfig } from '../src/models/RoleConfig.js';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set');
  process.exit(1);
}

async function seedRoleConfigs() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const roles = ['free', 'premium', 'admin'];
    const results = { created: [], existing: [], updated: [] };

    for (const role of roles) {
      const existing = await RoleConfig.findById(role);

      if (existing) {
        console.log(`Role config for '${role}' already exists`);
        results.existing.push(role);
      } else {
        const defaultConfig = getDefaultConfig(role);
        await RoleConfig.create(defaultConfig);
        console.log(`Created role config for '${role}'`);
        results.created.push(role);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Created: ${results.created.length > 0 ? results.created.join(', ') : 'none'}`);
    console.log(`Already existed: ${results.existing.length > 0 ? results.existing.join(', ') : 'none'}`);

    // Display current configs
    console.log('\n=== Current Role Configurations ===\n');
    for (const role of roles) {
      const config = await RoleConfig.findById(role);
      if (config) {
        console.log(`--- ${role.toUpperCase()} ---`);
        console.log('Limits:');
        console.log(`  maxNotes: ${config.limits.maxNotes === -1 ? 'Unlimited' : config.limits.maxNotes}`);
        console.log(`  maxTasks: ${config.limits.maxTasks === -1 ? 'Unlimited' : config.limits.maxTasks}`);
        console.log(`  maxProjects: ${config.limits.maxProjects === -1 ? 'Unlimited' : config.limits.maxProjects}`);
        console.log(`  maxEvents: ${config.limits.maxEvents === -1 ? 'Unlimited' : config.limits.maxEvents}`);
        console.log(`  maxImages: ${config.limits.maxImages === -1 ? 'Unlimited' : config.limits.maxImages}`);
        console.log(`  maxStorageBytes: ${config.limits.maxStorageBytes === -1 ? 'Unlimited' : formatBytes(config.limits.maxStorageBytes)}`);
        console.log(`  maxCategories: ${config.limits.maxCategories === -1 ? 'Unlimited' : config.limits.maxCategories}`);

        // Display features
        const features = config.features ? Object.fromEntries(config.features) : {};
        const enabledFeatures = Object.entries(features).filter(([, v]) => v).map(([k]) => k);
        const disabledFeatures = Object.entries(features).filter(([, v]) => !v).map(([k]) => k);

        console.log('Features:');
        console.log(`  Enabled: ${enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'none'}`);
        console.log(`  Disabled: ${disabledFeatures.length > 0 ? disabledFeatures.join(', ') : 'none'}`);
        console.log();
      }
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error seeding role configs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the script
seedRoleConfigs();
