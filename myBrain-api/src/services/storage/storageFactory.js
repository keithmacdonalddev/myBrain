import S3Provider from './S3Provider.js';
import LocalProvider from './LocalProvider.js';

/**
 * Storage Provider Factory
 * Returns the appropriate storage provider based on configuration
 */

// Cache providers to avoid creating multiple instances
const providerCache = new Map();

/**
 * Get a storage provider instance
 * @param {string} providerName - Provider name ('s3', 'local', 'default')
 * @param {Object} config - Optional configuration override
 * @returns {StorageProvider}
 */
export function getStorageProvider(providerName = 'default', config = {}) {
  // Resolve 'default' to actual provider from environment
  if (providerName === 'default') {
    providerName = process.env.STORAGE_PROVIDER || 'local';
  }

  // Create cache key
  const cacheKey = `${providerName}:${JSON.stringify(config)}`;

  // Return cached provider if exists
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey);
  }

  let provider;

  switch (providerName.toLowerCase()) {
    case 's3':
    case 'aws':
    case 'spaces': // DigitalOcean Spaces
    case 'minio':
      provider = new S3Provider(config);
      break;

    case 'local':
    case 'filesystem':
      provider = new LocalProvider(config);
      break;

    default:
      // Default to local for development safety
      console.warn(`Unknown storage provider "${providerName}", falling back to local`);
      provider = new LocalProvider(config);
  }

  // Cache the provider
  providerCache.set(cacheKey, provider);

  return provider;
}

/**
 * Get the default storage provider
 * @returns {StorageProvider}
 */
export function getDefaultProvider() {
  return getStorageProvider('default');
}

/**
 * Clear the provider cache (useful for testing)
 */
export function clearProviderCache() {
  providerCache.clear();
}

/**
 * Get provider info for diagnostics
 * @returns {Object}
 */
export function getProviderInfo() {
  const providerName = process.env.STORAGE_PROVIDER || 'local';
  const provider = getDefaultProvider();

  return {
    name: provider.providerName,
    configured: providerName,
    bucket: provider.bucket || 'N/A',
    region: provider.region || 'N/A',
  };
}

/**
 * Validate storage configuration
 * @returns {Object} Validation result
 */
export async function validateStorageConfig() {
  const result = {
    valid: true,
    provider: null,
    errors: [],
    warnings: [],
  };

  const providerName = process.env.STORAGE_PROVIDER || 'local';
  result.provider = providerName;

  try {
    const provider = getDefaultProvider();

    // For S3, check if bucket is configured
    if (providerName === 's3') {
      if (!process.env.AWS_S3_BUCKET) {
        result.errors.push('AWS_S3_BUCKET is not configured');
        result.valid = false;
      }
      if (!process.env.AWS_ACCESS_KEY_ID) {
        result.errors.push('AWS_ACCESS_KEY_ID is not configured');
        result.valid = false;
      }
      if (!process.env.AWS_SECRET_ACCESS_KEY) {
        result.errors.push('AWS_SECRET_ACCESS_KEY is not configured');
        result.valid = false;
      }

      // Try a simple operation to verify connectivity
      if (result.valid) {
        try {
          await provider.list('__test__', { maxKeys: 1 });
        } catch (error) {
          result.errors.push(`S3 connectivity test failed: ${error.message}`);
          result.valid = false;
        }
      }
    }

    // For local, check if base path is writable
    if (providerName === 'local') {
      const basePath = process.env.LOCAL_STORAGE_PATH || './uploads';
      result.warnings.push(`Using local storage at: ${basePath}`);

      if (process.env.NODE_ENV === 'production') {
        result.warnings.push('Local storage is not recommended for production');
      }
    }

  } catch (error) {
    result.errors.push(`Failed to initialize provider: ${error.message}`);
    result.valid = false;
  }

  return result;
}

export default {
  getStorageProvider,
  getDefaultProvider,
  clearProviderCache,
  getProviderInfo,
  validateStorageConfig,
};
