/**
 * =============================================================================
 * LOCALPROVIDER.JS - Local Filesystem Storage Implementation
 * =============================================================================
 *
 * This provider stores files on the local server's filesystem.
 * Used for development and self-hosted deployments.
 *
 * WHAT IS LOCAL STORAGE?
 * ----------------------
 * Local storage stores files directly on the server running myBrain:
 * - Files saved to ./uploads directory
 * - On server's hard disk
 * - Fast access (no network delays)
 * - Limited by server disk space
 *
 * WHEN TO USE LOCAL STORAGE:
 * ---------------------------
 * DEVELOPMENT:
 * - Easy setup (no AWS account needed)
 * - Fast testing
 * - No costs
 * - Works offline
 *
 * SELF-HOSTED:
 * - Running myBrain on your own server
 * - Want files on your own hardware
 * - Don't want to pay AWS fees
 * - Have large disk space available
 *
 * PRODUCTION CLOUD-HOSTED:
 * - NOT recommended (use S3Provider instead)
 * - Why not:
 *   - Server disk full → app breaks
 *   - Server crashes → files lost
 *   - Hard to scale to multiple servers
 *   - No automatic backups
 *
 * DIRECTORY STRUCTURE:
 * --------------------
 * ./uploads/              (base path)
 * ├── users/
 * │   ├── userId1/
 * │   │   ├── notes/
 * │   │   ├── files/
 * │   │   └── images/
 * │   └── userId2/
 * └── temp/
 *
 * FILE OPERATIONS:
 * ----------------
 * This provider implements:
 * - UPLOAD: Write file to disk
 * - DOWNLOAD: Read file from disk
 * - DELETE: Remove file from disk
 * - EXISTS: Check if file exists
 * - METADATA: Get file size, type, etc.
 * - LIST: List files in directory
 * - SIGNED URL: Create download link
 *
 * CONFIGURATION:
 * ----------------
 * Environment variables:
 * - LOCAL_STORAGE_PATH: Where to store files
 *   Default: ./uploads
 * - LOCAL_STORAGE_URL: Base URL for accessing files
 *   Default: /uploads (relative URL)
 *
 * EXAMPLE:
 * File saved as: ./uploads/users/123/file.pdf
 * Accessible at: http://localhost:5000/uploads/users/123/file.pdf
 *
 * DISK SPACE MANAGEMENT:
 * ----------------------
 * Important for self-hosted:
 * - Monitor disk space
 * - Set quotas per user (use limitService)
 * - Delete old temporary files
 * - Archive old files
 * - Consider backup strategy
 *
 * SECURITY CONSIDERATIONS:
 * -------------------------
 * - Ensure ./uploads outside web root (if possible)
 * - Restrict directory permissions
 * - Use randomized file names (no guessing)
 * - Validate file types
 * - Scan for malware (optional)
 * - Keep backups
 *
 * PERFORMANCE:
 * ---------------
 * Local storage vs S3:
 * - LOCAL: Faster (no network), limited scale
 * - S3: Slightly slower, unlimited scale
 *
 * BACKUP STRATEGY:
 * ----------------
 * Since files on local disk:
 * - Regular backups essential
 * - Consider RAID for redundancy
 * - Off-site backup copies
 * - Document recovery process
 *
 * MIGRATION PATH:
 * ----------------
 * Starting with local → Want to move to S3?
 * 1. Run migration script
 * 2. Copy files to S3
 * 3. Update database references
 * 4. Switch provider in config
 * 5. Verify all files accessible
 * 6. Delete local copies (optional)
 *
 * =============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import StorageProvider from './StorageProvider.js';

// =============================================================================
// LOCAL PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * Local Filesystem Storage Provider
 * For development and self-hosted deployments
 */
class LocalProvider extends StorageProvider {
  constructor(config = {}) {
    super(config);
    this.providerName = 'local';

    const {
      basePath = process.env.LOCAL_STORAGE_PATH || './uploads',
      baseUrl = process.env.LOCAL_STORAGE_URL || '/uploads',
    } = config;

    this.basePath = path.resolve(basePath);
    this.baseUrl = baseUrl;

    // Ensure base directory exists
    this._ensureDir(this.basePath);
  }

  async _ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  _getFullPath(key) {
    return path.join(this.basePath, key);
  }

  async upload(buffer, key, options = {}) {
    const fullPath = this._getFullPath(key);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await this._ensureDir(dir);

    // Write file
    await fs.writeFile(fullPath, buffer);

    // Write metadata file
    const { contentType = 'application/octet-stream', metadata = {} } = options;
    const metaPath = `${fullPath}.meta.json`;
    await fs.writeFile(metaPath, JSON.stringify({
      contentType,
      metadata,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    }));

    return {
      key,
      bucket: 'local',
      url: this.getPublicUrl(key),
      size: buffer.length,
    };
  }

  async download(key) {
    const fullPath = this._getFullPath(key);
    return fs.readFile(fullPath);
  }

  async delete(key) {
    const fullPath = this._getFullPath(key);
    const metaPath = `${fullPath}.meta.json`;

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Also delete metadata file
    try {
      await fs.unlink(metaPath);
    } catch (error) {
      // Ignore if metadata file doesn't exist
    }

    return true;
  }

  async getSignedUrl(key, expiresIn = 3600, operation = 'getObject') {
    // For local storage, we generate a simple token-based URL
    // In production, this should be handled by your web server with proper auth
    const expires = Date.now() + (expiresIn * 1000);
    const token = this._generateToken(key, expires);

    if (operation === 'putObject') {
      return `${this.baseUrl}/upload/${key}?token=${token}&expires=${expires}`;
    }

    return `${this.baseUrl}/${key}?token=${token}&expires=${expires}`;
  }

  async getUploadUrl(key, options = {}) {
    const { expiresIn = 3600 } = options;
    const url = await this.getSignedUrl(key, expiresIn, 'putObject');

    return {
      url,
      key,
      bucket: 'local',
      method: 'PUT',
    };
  }

  async copy(sourceKey, destKey) {
    const sourcePath = this._getFullPath(sourceKey);
    const destPath = this._getFullPath(destKey);
    const destDir = path.dirname(destPath);

    await this._ensureDir(destDir);
    await fs.copyFile(sourcePath, destPath);

    // Copy metadata file too
    const sourceMetaPath = `${sourcePath}.meta.json`;
    const destMetaPath = `${destPath}.meta.json`;
    try {
      await fs.copyFile(sourceMetaPath, destMetaPath);
    } catch (error) {
      // Ignore if metadata file doesn't exist
    }

    return {
      key: destKey,
      url: this.getPublicUrl(destKey),
    };
  }

  async exists(key) {
    const fullPath = this._getFullPath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key) {
    const fullPath = this._getFullPath(key);
    const metaPath = `${fullPath}.meta.json`;

    const stats = await fs.stat(fullPath);

    let meta = {
      contentType: 'application/octet-stream',
      metadata: {},
    };

    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(metaContent);
    } catch (error) {
      // Metadata file might not exist
    }

    return {
      size: stats.size,
      contentType: meta.contentType,
      lastModified: stats.mtime,
      metadata: meta.metadata || {},
    };
  }

  async list(prefix, options = {}) {
    const { maxKeys = 1000 } = options;
    const prefixPath = this._getFullPath(prefix);

    const files = [];

    async function walkDir(dir, baseKey) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (error.code === 'ENOENT') {
          return;
        }
        throw error;
      }

      for (const entry of entries) {
        if (files.length >= maxKeys) break;

        const entryPath = path.join(dir, entry.name);
        const entryKey = path.join(baseKey, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          await walkDir(entryPath, entryKey);
        } else if (!entry.name.endsWith('.meta.json')) {
          const stats = await fs.stat(entryPath);
          files.push({
            key: entryKey,
            size: stats.size,
            lastModified: stats.mtime,
          });
        }
      }
    }

    await walkDir(prefixPath, prefix);

    return {
      files,
      isTruncated: files.length >= maxKeys,
    };
  }

  getPublicUrl(key) {
    return `${this.baseUrl}/${key}`;
  }

  _generateToken(key, expires) {
    const secret = process.env.JWT_SECRET || 'local-storage-secret';
    const data = `${key}:${expires}`;
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
      .substring(0, 32);
  }

  // Verify a signed URL token
  verifyToken(key, token, expires) {
    if (Date.now() > expires) {
      return false;
    }
    const expectedToken = this._generateToken(key, expires);
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
  }
}

export default LocalProvider;
