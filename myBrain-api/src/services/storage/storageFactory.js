/**
 * =============================================================================
 * STORAGEFACTORY.JS - Storage Provider Factory Pattern
 * =============================================================================
 *
 * This file uses the "Factory" design pattern to create storage providers.
 * Instead of deciding in routes which storage to use, the factory decides
 * automatically based on configuration.
 *
 * WHAT IS A FACTORY?
 * ------------------
 * A factory is a function that creates objects for you:
 * - You ask: "I need a storage provider"
 * - Factory decides: "You need S3Provider" or "LocalProvider"
 * - Factory creates it and returns it
 * - You use it without knowing HOW it was created
 *
 * WHY USE A FACTORY?
 * ------------------
 * WITHOUT FACTORY:
 * Routes must know how to create each provider:
 * if (env === 'production') {
 *   storage = new S3Provider(...)
 * } else {
 *   storage = new LocalProvider(...)
 * }
 * Problem: Routes get complicated, config logic spread everywhere
 *
 * WITH FACTORY:
 * Routes just ask for a provider:
 * storage = getStorageProvider()
 * Factory handles the logic, routes stay simple
 *
 * PROVIDER SELECTION LOGIC:
 * -------------------------
 * The factory checks STORAGE_PROVIDER environment variable:
 * - 's3' or 'aws' → Use S3Provider (production)
 * - 'spaces' → DigitalOcean Spaces (S3-compatible)
 * - 'minio' → Self-hosted S3-compatible
 * - 'local' → Use LocalProvider (development)
 * - 'default' → Reads STORAGE_PROVIDER from env
 *
 * EXAMPLE USAGE:
 * ----------------
 * // In fileService.js
 * import { getStorageProvider } from './storageFactory.js';
 *
 * const storage = getStorageProvider(); // Gets right provider
 * await storage.upload(buffer, key);    // Works with any provider
 *
 * PROVIDER CACHING:
 * -----------------
 * Factory caches providers to avoid creating multiple instances:
 * - First call: Creates new provider, caches it
 * - Subsequent calls: Returns cached provider
 * - Saves memory and connection resources
 *
 * SUPPORTED PROVIDERS:
 * --------------------
 * 1. S3PROVIDER: AWS S3 (and S3-compatible services)
 *    - AWS S3
 *    - DigitalOcean Spaces
 *    - MinIO
 *    - Backblaze B2
 *
 * 2. LOCALPROVIDER: Local filesystem
 *    - For development
 *    - For self-hosted
 *
 * CONFIGURATION:
 * ----------------
 * Set environment variable:
 * STORAGE_PROVIDER=s3  (production)
 * STORAGE_PROVIDER=local (development)
 *
 * Then provider-specific env vars:
 * For S3:
 * - AWS_S3_BUCKET
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 *
 * For Local:
 * - LOCAL_STORAGE_PATH
 * - LOCAL_STORAGE_URL
 *
 * EXTENDING:
 * -----------
 * Want to add new provider (e.g., Azure)?
 * 1. Create AzureProvider.js
 * 2. Add to factory switch statement
 * 3. Done! Rest of app uses it automatically
 *
 * Example:
 * case 'azure':
 *   provider = new AzureProvider(config);
 *   break;
 *
 * INSTANTIATION:
 * ----------------
 * getStorageProvider() is typically called once:
 * - In fileService initialization
 * - Or where files are used
 * - Returns same instance (cached) for efficiency
 *
 * DEPENDENCY INJECTION:
 * ---------------------
 * This is called "dependency injection":
 * - Instead of hardcoding dependencies
 * - They're provided from outside
 * - Makes testing easier (use fake provider)
 * - Makes switching providers easy
 *
 * =============================================================================
 */

import S3Provider from './S3Provider.js';
import LocalProvider from './LocalProvider.js';

// =============================================================================
// PROVIDER CACHE
// =============================================================================
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
