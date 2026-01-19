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
