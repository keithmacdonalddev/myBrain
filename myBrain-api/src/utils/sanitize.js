/**
 * =============================================================================
 * SANITIZE.JS - Input Sanitization Utilities
 * =============================================================================
 *
 * This file provides functions to sanitize user input before using it in
 * potentially dangerous operations like regex matching.
 *
 * WHY SANITIZE INPUT?
 * -------------------
 * User input can contain special characters that have meaning in regular
 * expressions. If used directly, these can cause:
 * 1. ReDoS (Regular Expression Denial of Service) attacks
 * 2. Unexpected search behavior
 * 3. Application crashes
 *
 * REDOS ATTACKS:
 * --------------
 * Some regex patterns can be crafted to make the regex engine run forever.
 * Example: Searching for "aaaaaaaaaaaaaaaaaaa!" against a naive pattern
 * can cause exponential backtracking, freezing the server.
 *
 * By escaping special characters, we ensure user input is treated as
 * literal text, not as regex commands.
 *
 * =============================================================================
 */

/**
 * escapeRegex(string) - Escape Special Regex Characters
 * ======================================================
 * Converts a string so it can be safely used in a regular expression.
 * All characters that have special meaning in regex are escaped with backslash.
 *
 * SPECIAL CHARACTERS ESCAPED:
 * - . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param {string} string - The string to escape
 * @returns {string} - String safe for use in regex
 *
 * EXAMPLE:
 * escapeRegex("test.*search") => "test\\.\\*search"
 * This ensures ".*" is treated as literal characters, not "match anything"
 */
export function escapeRegex(string) {
  // Replace all special regex characters with escaped versions
  // The character class [.*+?^${}()|[\]\\] matches all regex metacharacters
  // \\$& in the replacement means: backslash + the matched character
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * sanitizeSearchQuery(query, maxLength) - Sanitize User Search Input
 * ===================================================================
 * Prepares user input for safe use in regex-based searches.
 * Performs multiple safety operations:
 * 1. Validates input type (must be string)
 * 2. Truncates to maximum length (prevents large inputs)
 * 3. Trims whitespace
 * 4. Escapes regex special characters
 *
 * @param {string} query - User-provided search query
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string} - Sanitized, regex-safe search string
 *
 * EXAMPLE:
 * sanitizeSearchQuery("test.*+?search", 100) => "test\\.\\*\\+\\?search"
 * sanitizeSearchQuery(null) => ""
 * sanitizeSearchQuery("a".repeat(200), 100) => "a".repeat(100) (escaped)
 *
 * WHY MAX LENGTH?
 * ---------------
 * Very long regex patterns can:
 * 1. Use excessive memory
 * 2. Take longer to compile and execute
 * 3. Potentially be crafted for ReDoS attacks
 * 100 characters is generous for search terms while limiting risk.
 */
export function sanitizeSearchQuery(query, maxLength = 100) {
  // Handle null, undefined, or non-string input
  if (!query || typeof query !== 'string') return '';

  // Truncate to max length and trim whitespace
  const trimmed = query.substring(0, maxLength).trim();

  // Escape all regex special characters
  return escapeRegex(trimmed);
}

/**
 * Default export with all sanitization functions.
 *
 * USAGE:
 * import { escapeRegex, sanitizeSearchQuery } from '../utils/sanitize.js';
 *
 * Or:
 * import sanitize from '../utils/sanitize.js';
 * sanitize.escapeRegex(...)
 */
export default {
  escapeRegex,
  sanitizeSearchQuery
};
