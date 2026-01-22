/**
 * =============================================================================
 * S3PROVIDER.JS - AWS S3 Cloud Storage Implementation
 * =============================================================================
 *
 * This provider handles file storage using Amazon S3 (Simple Storage Service)
 * or S3-compatible services (DigitalOcean Spaces, MinIO, etc.).
 *
 * WHAT IS AWS S3?
 * ---------------
 * AWS S3 is Amazon's cloud storage service:
 * - Store files in the cloud (not on myBrain servers)
 * - Highly reliable (99.999% uptime)
 * - Scales automatically (no size limits)
 * - Pay only for what you use
 * - Built-in security and backups
 *
 * WHY USE S3 INSTEAD OF LOCAL STORAGE?
 * -------------------------------------
 * LOCAL STORAGE (store on server):
 * - Simple for small apps
 * - Files lost if server crashes
 * - Limited by server disk space
 * - Hard to scale
 *
 * S3 CLOUD STORAGE (this provider):
 * - Highly available (backups automatically)
 * - Unlimited scalability
 * - Better security features
 * - Pay-as-you-go pricing
 * - Easy to move data
 * - Professional-grade reliability
 *
 * S3-COMPATIBLE SERVICES:
 * -----------------------
 * Besides AWS S3, this provider works with:
 * - DIGITALOCEAN SPACES: Similar to S3, cheaper
 * - MINIO: Open-source S3-compatible storage
 * - BACKBLAZE B2: Affordable cloud storage
 * - Any S3-compatible service
 *
 * HOW S3 STORAGE WORKS:
 * --------------------
 * 1. USER UPLOADS FILE: Selects file on computer
 * 2. MYAPP PROCESSES: Validates, prepares file
 * 3. SEND TO S3: Uploads to AWS S3 bucket
 * 4. S3 STORES: File stored redundantly across servers
 * 5. GET URL: myBrain gets download/preview URL
 * 6. USER DOWNLOADS: Gets file from S3 (not myBrain server)
 *
 * S3 BUCKETS:
 * -----------
 * A bucket is like a folder in S3:
 * - Each myBrain account has bucket
 * - Bucket name must be globally unique
 * - Contains all user files
 * - Has permissions/access control
 *
 * OBJECT KEYS:
 * -----------
 * Files in S3 are identified by key (path):
 * Example: users/123abc/files/2024/report.pdf
 *
 * SIGNED URLS:
 * -----------
 * Temporary URLs for secure access:
 * - Valid for limited time (e.g., 1 hour)
 * - User can download without AWS credentials
 * - Expires automatically
 * - Good for sharing temporary access
 *
 * S3 OPERATIONS (what this provider does):
 * ----------------------------------------
 * - UPLOAD: Store file in bucket
 * - DOWNLOAD: Retrieve file from bucket
 * - DELETE: Remove file from bucket
 * - COPY: Duplicate file
 * - EXISTS: Check if file exists
 * - METADATA: Get file info (size, type, etc.)
 * - LIST: List files in bucket
 * - SIGNED URL: Generate temporary download link
 *
 * CONFIGURATION:
 * ----------------
 * Environment variables:
 * - AWS_ACCESS_KEY_ID: AWS account access key
 * - AWS_SECRET_ACCESS_KEY: AWS account secret key
 * - AWS_REGION: Which region (us-east-1, eu-west-1, etc.)
 * - AWS_S3_BUCKET: Bucket name
 * - S3_ENDPOINT: Optional (for non-AWS S3 services)
 *
 * PRICING (AWS S3):
 * ------------------
 * - Storage: ~$0.023/GB/month
 * - Requests: ~$0.0004 per 10,000 requests
 * - Data transfer: ~$0.09/GB (outbound)
 * - Example: 100 GB = ~$2.30/month
 *
 * ERROR HANDLING:
 * ---------------
 * Errors from S3:
 * - NoSuchKey: File doesn't exist
 * - AccessDenied: No permission
 * - ServiceUnavailable: S3 is down
 * - RequestTimeout: Network issue
 *
 * =============================================================================
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import StorageProvider from './StorageProvider.js';
import { colors, LOG_LEVEL, LOG_LEVELS } from '../../middleware/requestLogger.js';

// =============================================================================
// S3 CONSOLE LOGGING
// =============================================================================
/**
 * logStorageOp(eventName, data) - Log S3 Operations to Console
 * =============================================================
 * Prints S3 storage operations to the terminal with the same style as HTTP
 * and WebSocket logging. Events are prefixed with [S3] to distinguish them.
 *
 * WHAT THIS LOGS:
 * - File uploads to S3
 * - File downloads from S3
 * - File deletions
 * - Errors during operations
 *
 * WHY LOG S3 OPERATIONS?
 * ----------------------
 * 1. VISIBILITY: See when files are uploaded/downloaded
 * 2. DEBUGGING: Identify slow or failing S3 operations
 * 3. MONITORING: Track storage usage patterns
 * 4. COST: S3 charges per request, so logging helps track usage
 *
 * EXAMPLE OUTPUT:
 * [S3] upload.start
 *   key: images/507f.../photo.jpg
 *   size: 2.4MB
 *
 * [S3] upload.complete (1,234ms)
 *   key: images/507f.../photo.jpg
 *
 * @param {string} eventName - Name of the S3 operation
 * @param {Object} data - Event data containing:
 *   - key: S3 object key (file path)
 *   - size: File size in bytes
 *   - durationMs: Time taken (for completion events)
 *   - error: Error message (if any)
 */
function logStorageOp(eventName, data = {}) {
  // Check log level
  const level = LOG_LEVELS[LOG_LEVEL] || 0;
  if (level === 0) return;

  const { key, size, durationMs, error, count } = data;
  const errorTag = error ? ` ${colors.red}[ERROR]${colors.reset}` : '';
  const durationTag = durationMs ? ` ${colors.dim}(${durationMs}ms)${colors.reset}` : '';

  // Level 1 (minimal): Just the event name
  console.log(`${colors.yellow}[S3]${colors.reset} ${eventName}${durationTag}${errorTag}`);

  if (level < 2) return;

  // Level 2 (normal): Add key and size
  if (key) {
    // Truncate long keys for readability
    const displayKey = key.length > 50 ? '...' + key.slice(-47) : key;
    console.log(`${colors.dim}  key: ${displayKey}${colors.reset}`);
  }
  if (size) {
    const sizeStr = formatBytes(size);
    console.log(`${colors.dim}  size: ${sizeStr}${colors.reset}`);
  }
  if (count !== undefined) {
    console.log(`${colors.dim}  count: ${count}${colors.reset}`);
  }

  if (level < 3) return;

  // Level 3 (verbose): Add error details
  if (error) {
    console.log(`${colors.red}  error: ${error}${colors.reset}`);
  }

  // Blank line for readability
  console.log('');
}

/**
 * formatBytes(bytes) - Format Bytes to Human Readable
 * ====================================================
 * Converts bytes to KB, MB, GB, etc. for display.
 *
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "2.4MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// S3 PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * AWS S3 / S3-Compatible Storage Provider
 * Supports AWS S3, DigitalOcean Spaces, MinIO, etc.
 */
class S3Provider extends StorageProvider {
  constructor(config = {}) {
    super(config);
    this.providerName = 's3';

    const {
      bucket = process.env.AWS_S3_BUCKET,
      region = process.env.AWS_REGION || 'us-east-1',
      accessKeyId = process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY,
      endpoint = process.env.S3_ENDPOINT, // For S3-compatible services
      forcePathStyle = false, // For S3-compatible services
    } = config;

    this.bucket = bucket;
    this.region = region;

    const clientConfig = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    // For S3-compatible services (DigitalOcean Spaces, MinIO, etc.)
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = forcePathStyle;
    }

    this.client = new S3Client(clientConfig);
  }

  async upload(buffer, key, options = {}) {
    const startTime = Date.now();
    const { contentType = 'application/octet-stream', metadata = {} } = options;

    // Log upload start
    logStorageOp('upload.start', { key, size: buffer.length });

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);

      const durationMs = Date.now() - startTime;
      logStorageOp('upload.complete', { key, durationMs });

      return {
        key,
        bucket: this.bucket,
        url: this.getPublicUrl(key),
        size: buffer.length,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logStorageOp('upload.error', { key, durationMs, error: error.message });
      throw error;
    }
  }

  async download(key) {
    const startTime = Date.now();

    // Log download start
    logStorageOp('download.start', { key });

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const durationMs = Date.now() - startTime;
      logStorageOp('download.complete', { key, size: buffer.length, durationMs });

      return buffer;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logStorageOp('download.error', { key, durationMs, error: error.message });
      throw error;
    }
  }

  async delete(key) {
    const startTime = Date.now();

    logStorageOp('delete.start', { key });

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      const durationMs = Date.now() - startTime;
      logStorageOp('delete.complete', { key, durationMs });

      return true;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logStorageOp('delete.error', { key, durationMs, error: error.message });
      throw error;
    }
  }

  async deleteMany(keys) {
    if (keys.length === 0) {
      return { deleted: 0, errors: [] };
    }

    // S3 allows up to 1000 objects per delete request
    const batchSize = 1000;
    const results = { deleted: 0, errors: [] };

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);

      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: batch.map(Key => ({ Key })),
          Quiet: false,
        },
      });

      try {
        const response = await this.client.send(command);
        results.deleted += response.Deleted?.length || 0;
        if (response.Errors) {
          results.errors.push(...response.Errors.map(e => `${e.Key}: ${e.Message}`));
        }
      } catch (error) {
        results.errors.push(`Batch delete failed: ${error.message}`);
      }
    }

    return results;
  }

  async getSignedUrl(key, expiresIn = 3600, operation = 'getObject') {
    const CommandClass = operation === 'putObject' ? PutObjectCommand : GetObjectCommand;

    const command = new CommandClass({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async getUploadUrl(key, options = {}) {
    const { contentType = 'application/octet-stream', expiresIn = 3600 } = options;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });

    return {
      url,
      key,
      bucket: this.bucket,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
    };
  }

  async copy(sourceKey, destKey) {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destKey,
    });

    await this.client.send(command);

    return {
      key: destKey,
      url: this.getPublicUrl(destKey),
    };
  }

  async exists(key) {
    try {
      await this.getMetadata(key);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(key) {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata || {},
      etag: response.ETag,
    };
  }

  async list(prefix, options = {}) {
    const { maxKeys = 1000, continuationToken } = options;

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });

    const response = await this.client.send(command);

    return {
      files: (response.Contents || []).map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag,
      })),
      continuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated,
    };
  }

  getPublicUrl(key) {
    // For S3-compatible services with custom endpoints
    if (process.env.S3_ENDPOINT) {
      const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
      return `${endpoint}/${this.bucket}/${key}`;
    }

    // Standard AWS S3 URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

export default S3Provider;
