#!/usr/bin/env node

/**
 * Migrate Images from Cloudinary to S3
 *
 * This script migrates all existing Cloudinary images to S3 storage.
 * It downloads images from Cloudinary, processes them with Sharp,
 * uploads to S3, and updates the database records.
 *
 * Usage: node scripts/migrateImagesToS3.js [--dry-run] [--batch-size=10]
 *
 * Options:
 *   --dry-run       Show what would be migrated without making changes
 *   --batch-size=N  Process N images at a time (default: 10)
 *   --skip=N        Skip first N images (for resuming)
 *   --limit=N       Only migrate N images total
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import Image from '../src/models/Image.js';
import { getDefaultProvider } from '../src/services/storage/storageFactory.js';
import { processImage } from '../src/services/imageProcessingService.js';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '10', 10);
const skip = parseInt(args.find(a => a.startsWith('--skip='))?.split('=')[1] || '0', 10);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

/**
 * Download image from URL
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        return downloadImage(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Migrate a single image from Cloudinary to S3
 */
async function migrateImage(image, storage) {
  const timestamp = Date.now();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const ext = `.${image.format || 'jpg'}`;

  // Download from Cloudinary
  const imageUrl = image.secureUrl || image.url;
  console.log(`    Downloading from Cloudinary...`);
  const buffer = await downloadImage(imageUrl);

  // Process with Sharp
  console.log(`    Processing with Sharp...`);
  const processed = await processImage(buffer, {
    generateThumbnail: true,
    optimizeOriginal: true,
  });

  // Generate S3 keys
  const storageKey = `${image.userId}/images/${image.folder}/${timestamp}-${uniqueId}${ext}`;
  const thumbnailKey = `${image.userId}/images/${image.folder}/thumbnails/${timestamp}-${uniqueId}.jpg`;

  // Upload to S3
  console.log(`    Uploading to S3...`);
  const [originalResult] = await Promise.all([
    storage.upload(processed.original, storageKey, {
      contentType: image.mimeType || `image/${image.format}`,
      metadata: {
        originalName: image.originalName,
        userId: image.userId.toString(),
        migratedFrom: 'cloudinary',
        cloudinaryId: image.cloudinaryId,
      },
    }),
    storage.upload(processed.thumbnail, thumbnailKey, {
      contentType: 'image/jpeg',
    }),
  ]);

  // Update database record
  console.log(`    Updating database...`);
  image.storageProvider = 's3';
  image.storageKey = storageKey;
  image.storageBucket = originalResult.bucket;
  image.thumbnailKey = thumbnailKey;
  image.size = processed.original.length;

  // Update dimensions if changed
  if (processed.metadata.processedWidth) {
    image.width = processed.metadata.processedWidth;
  }
  if (processed.metadata.processedHeight) {
    image.height = processed.metadata.processedHeight;
  }

  // Update colors if available
  if (processed.metadata.dominantColor) {
    image.dominantColor = processed.metadata.dominantColor;
  }
  if (processed.metadata.colors) {
    image.colors = processed.metadata.colors;
  }

  await image.save();

  return { storageKey, thumbnailKey };
}

async function main() {
  console.log('=== Cloudinary to S3 Image Migration ===\n');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  console.log(`Batch size: ${batchSize}`);
  if (skip > 0) console.log(`Skipping first: ${skip} images`);
  if (limit > 0) console.log(`Limit: ${limit} images`);
  console.log();

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get storage provider
    const storage = getDefaultProvider();
    console.log(`Storage provider: ${storage.providerName}`);
    console.log(`Bucket: ${storage.bucket}\n`);

    // Find Cloudinary images that haven't been migrated
    const query = {
      $or: [
        { storageProvider: 'cloudinary' },
        { storageProvider: { $exists: false }, cloudinaryId: { $exists: true, $ne: null } }
      ]
    };

    const totalCount = await Image.countDocuments(query);
    console.log(`Found ${totalCount} Cloudinary images to migrate\n`);

    if (totalCount === 0) {
      console.log('No images to migrate!');
      return;
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors = [];

    // Process in batches
    const maxImages = limit > 0 ? Math.min(limit, totalCount - skip) : totalCount - skip;

    while (processed < maxImages) {
      const batch = await Image.find(query)
        .skip(skip + processed)
        .limit(batchSize);

      if (batch.length === 0) break;

      console.log(`\nProcessing batch ${Math.floor(processed / batchSize) + 1} (${batch.length} images)...\n`);

      for (const image of batch) {
        const index = skip + processed + 1;
        console.log(`[${index}/${skip + maxImages}] ${image.originalName} (${image._id})`);

        if (dryRun) {
          console.log(`    Would migrate: ${image.cloudinaryId} -> S3`);
          successful++;
        } else {
          try {
            const result = await migrateImage(image, storage);
            console.log(`    SUCCESS: ${result.storageKey}`);
            successful++;
          } catch (error) {
            console.error(`    FAILED: ${error.message}`);
            errors.push({ id: image._id, name: image.originalName, error: error.message });
            failed++;
          }
        }

        processed++;

        if (limit > 0 && processed >= limit) break;
      }
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\nFailed images:');
      errors.forEach(e => {
        console.log(`  - ${e.name} (${e.id}): ${e.error}`);
      });
    }

    if (dryRun) {
      console.log('\nThis was a dry run. Run without --dry-run to perform the migration.');
    }

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

main();
