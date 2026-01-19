/**
 * Abstract Storage Provider Interface
 * All storage providers must implement these methods
 */
class StorageProvider {
  constructor(config = {}) {
    this.config = config;
    this.providerName = 'abstract';
  }

  /**
   * Upload a file to storage
   * @param {Buffer} buffer - File data
   * @param {string} key - Storage key/path
   * @param {Object} options - Upload options
   * @param {string} options.contentType - MIME type
   * @param {Object} options.metadata - Custom metadata
   * @returns {Promise<{key: string, url: string, size: number}>}
   */
  async upload(buffer, key, options = {}) {
    throw new Error('upload() must be implemented by storage provider');
  }

  /**
   * Download a file from storage
   * @param {string} key - Storage key/path
   * @returns {Promise<Buffer>}
   */
  async download(key) {
    throw new Error('download() must be implemented by storage provider');
  }

  /**
   * Delete a file from storage
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    throw new Error('delete() must be implemented by storage provider');
  }

  /**
   * Delete multiple files from storage
   * @param {string[]} keys - Array of storage keys
   * @returns {Promise<{deleted: number, errors: string[]}>}
   */
  async deleteMany(keys) {
    const results = { deleted: 0, errors: [] };
    for (const key of keys) {
      try {
        await this.delete(key);
        results.deleted++;
      } catch (error) {
        results.errors.push(`${key}: ${error.message}`);
      }
    }
    return results;
  }

  /**
   * Generate a signed URL for file access
   * @param {string} key - Storage key/path
   * @param {number} expiresIn - Expiration in seconds
   * @param {string} operation - 'getObject' or 'putObject'
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresIn = 3600, operation = 'getObject') {
    throw new Error('getSignedUrl() must be implemented by storage provider');
  }

  /**
   * Generate a signed URL for uploading
   * @param {string} key - Storage key/path
   * @param {Object} options - Upload options
   * @param {string} options.contentType - Expected MIME type
   * @param {number} options.expiresIn - Expiration in seconds
   * @returns {Promise<{url: string, fields?: Object}>}
   */
  async getUploadUrl(key, options = {}) {
    throw new Error('getUploadUrl() must be implemented by storage provider');
  }

  /**
   * Copy a file within storage
   * @param {string} sourceKey - Source key
   * @param {string} destKey - Destination key
   * @returns {Promise<{key: string, url: string}>}
   */
  async copy(sourceKey, destKey) {
    throw new Error('copy() must be implemented by storage provider');
  }

  /**
   * Check if a file exists
   * @param {string} key - Storage key/path
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('exists() must be implemented by storage provider');
  }

  /**
   * Get file metadata
   * @param {string} key - Storage key/path
   * @returns {Promise<{size: number, contentType: string, lastModified: Date, metadata: Object}>}
   */
  async getMetadata(key) {
    throw new Error('getMetadata() must be implemented by storage provider');
  }

  /**
   * List files with a prefix
   * @param {string} prefix - Key prefix
   * @param {Object} options - List options
   * @param {number} options.maxKeys - Maximum keys to return
   * @param {string} options.continuationToken - Pagination token
   * @returns {Promise<{files: Array, continuationToken?: string}>}
   */
  async list(prefix, options = {}) {
    throw new Error('list() must be implemented by storage provider');
  }

  /**
   * Get public URL for a file (if publicly accessible)
   * @param {string} key - Storage key/path
   * @returns {string}
   */
  getPublicUrl(key) {
    throw new Error('getPublicUrl() must be implemented by storage provider');
  }

  /**
   * Generate a unique storage key
   * @param {string} userId - User ID
   * @param {string} filename - Original filename
   * @param {string} folder - Optional subfolder
   * @returns {string}
   */
  generateKey(userId, filename, folder = 'files') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${folder}/${timestamp}-${randomSuffix}-${safeFilename}`;
  }

  /**
   * Generate thumbnail key from file key
   * @param {string} fileKey - Original file key
   * @returns {string}
   */
  getThumbnailKey(fileKey) {
    const parts = fileKey.split('/');
    const filename = parts.pop();
    return [...parts.slice(0, 1), 'thumbnails', filename.replace(/\.[^.]+$/, '.jpg')].join('/');
  }
}

export default StorageProvider;
