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
    const { contentType = 'application/octet-stream', metadata = {} } = options;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    return {
      key,
      bucket: this.bucket,
      url: this.getPublicUrl(key),
      size: buffer.length,
    };
  }

  async download(key) {
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
    return Buffer.concat(chunks);
  }

  async delete(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    return true;
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
