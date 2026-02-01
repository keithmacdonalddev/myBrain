import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'dompurify';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge to handle conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a large number with thousands separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num == null || num === 0) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Shorten Claude model name for display
 * @param {string} model - Full model name (e.g., "claude-opus-4-5-20251101")
 * @returns {string} Shortened model name (e.g., "opus-4-5")
 */
export function formatModelName(model) {
  if (!model) return model;
  const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : model;
}

/**
 * Strip HTML tags from rich text content for clean preview display
 * @param {string} html - HTML content from TipTap editor
 * @param {number} maxLength - Maximum characters to return (default 200)
 * @returns {string} Plain text preview
 */
/**
 * Get display name for a user with smart fallback
 * Priority: displayName > firstName lastName > firstName > email username > 'User'
 *
 * @param {Object} user - User object (may have profile nested or flat)
 * @param {Object} options - Options
 * @param {string} options.fallback - Fallback text if no name found (default: 'User')
 * @returns {string} Display name
 */
export function getDisplayName(user, options = {}) {
  const { fallback = 'User' } = options;

  if (!user) return fallback;

  // Handle both nested profile and flat profile structures
  const profile = user.profile || user;
  const email = user.email || profile.email;

  // Try displayName first
  if (profile.displayName) return profile.displayName;

  // Try firstName + lastName
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }

  // Try firstName only
  if (profile.firstName) return profile.firstName;

  // Fallback to email username (before @)
  if (email) {
    return email.split('@')[0];
  }

  return fallback;
}

/**
 * Get user initials for avatar display
 *
 * @param {Object} user - User object
 * @returns {string} 1-2 character initials or '?'
 */
export function getUserInitials(user) {
  const name = getDisplayName(user, { fallback: '' });

  if (!name) return '?';

  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Extract city/region from a full address for privacy
 * Removes street addresses, keeping only city, state/province, country
 *
 * @param {string} location - Full location string
 * @returns {string} Privacy-safe location (city, region)
 */
export function getPrivacySafeLocation(location) {
  if (!location) return '';

  // Split by comma
  const parts = location.split(',').map(part => part.trim());

  if (parts.length === 0) return location;

  // Filter out parts that look like street addresses (contain numbers at the start)
  const filteredParts = parts.filter(part => {
    // Skip parts that start with numbers (street addresses)
    if (/^\d/.test(part)) return false;
    // Skip parts that are just numbers (postal codes)
    if (/^\d+$/.test(part)) return false;
    // Skip parts that look like postal codes (alphanumeric with spaces)
    if (/^[A-Z0-9]{2,}\s*[A-Z0-9]{2,}$/i.test(part)) return false;
    return true;
  });

  // If we filtered everything, return the last part (probably city/country)
  if (filteredParts.length === 0) {
    return parts[parts.length - 1];
  }

  // Return first 2-3 meaningful parts (city, state/province, country)
  return filteredParts.slice(0, 3).join(', ');
}

/**
 * Validate and sanitize a URL to prevent XSS attacks
 * Only allows http: and https: protocols
 * Blocks javascript:, data:, vbscript:, and other dangerous protocols
 *
 * @param {string} url - The URL to validate
 * @returns {string|null} The safe URL or null if invalid/dangerous
 */
export function getSafeUrl(url) {
  if (!url || typeof url !== 'string') return null;

  // Trim whitespace
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;

  try {
    const parsed = new URL(trimmedUrl);
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmedUrl;
    }
  } catch {
    // Invalid URL format - could be a relative URL or malformed
    // Check if it looks like a domain without protocol
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+/.test(trimmedUrl)) {
      // Looks like a domain, prepend https://
      return `https://${trimmedUrl}`;
    }
  }

  // URL is either invalid or uses a dangerous protocol
  return null;
}

export function stripHtmlForPreview(html, maxLength = 200) {
  if (!html) return '';

  // Sanitize HTML defensively - removes all HTML tags for text extraction
  // This is defense-in-depth: even if output is later used as HTML, it's safe
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });

  // Normalize whitespace (collapse multiple spaces/newlines)
  let text = sanitized.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + '...';
  }

  return text;
}
