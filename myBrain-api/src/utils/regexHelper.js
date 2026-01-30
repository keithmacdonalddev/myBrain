/**
 * =============================================================================
 * REGEXHELPER.JS - Regular Expression Utilities
 * =============================================================================
 *
 * This utility provides functions for safely working with regular expressions,
 * particularly for preventing ReDoS (Regular Expression Denial of Service)
 * attacks when user input is used in regex patterns.
 *
 * WHAT IS ReDoS?
 * --------------
 * ReDoS is a type of attack where a malicious user provides input that causes
 * a regular expression to take an extremely long time to evaluate. This can
 * cause the server to hang or crash.
 *
 * EXAMPLE OF ReDoS:
 * -----------------
 * If a user searches for: "aaaaaaaaaaaaaaaa!"
 * And the regex is: /^(a+)+$/
 * The regex engine has to backtrack exponentially, taking seconds or minutes.
 *
 * HOW TO PREVENT ReDoS:
 * ---------------------
 * 1. ESCAPE USER INPUT: Convert special regex characters to literal characters
 *    - User types: "hello.*world" → Escaped: "hello\\.\\*world"
 *    - Now it searches for literal ".*" instead of treating it as regex
 *
 * 2. LIMIT INPUT LENGTH: Reject overly long inputs
 *
 * 3. USE TIMEOUTS: Set regex execution timeouts (not possible in JS)
 *
 * This file provides the escaping function (#1 above).
 *
 * USED BY:
 * - Activity search endpoint (GET /profile/activity?search=...)
 *
 * =============================================================================
 */

// =============================================================================
// ESCAPE REGEX
// =============================================================================

/**
 * escapeRegex(string)
 * -------------------
 * Escape special regex characters in a string so it can be safely used
 * as a literal pattern in a regular expression.
 *
 * WHAT IT ESCAPES:
 * ----------------
 * These characters have special meaning in regex:
 * - . (any character)
 * - * (zero or more)
 * - + (one or more)
 * - ? (optional)
 * - ^ (start of string)
 * - $ (end of string)
 * - { } (quantifiers)
 * - [ ] (character classes)
 * - ( ) (groups)
 * - | (alternation)
 * - \ (escape character)
 *
 * After escaping, these become literal characters that are matched exactly.
 *
 * @param {string} string - User input to escape
 * @returns {string} - Escaped string safe for use in regex
 *
 * EXAMPLES:
 * escapeRegex('hello')            // Returns: hello (no change)
 * escapeRegex('hello.world')      // Returns: hello\.world
 * escapeRegex('a+b*c?')           // Returns: a\+b\*c\?
 * escapeRegex('[test]')           // Returns: \[test\]
 * escapeRegex('(foo|bar)')        // Returns: \(foo\|bar\)
 * escapeRegex('$100')             // Returns: \$100
 * escapeRegex('path\\to\\file')   // Returns: path\\\\to\\\\file
 *
 * USAGE WITH MONGODB:
 * -------------------
 * When using user input in MongoDB regex queries, always escape:
 *
 * // BAD - vulnerable to ReDoS
 * const query = { eventName: { $regex: userInput, $options: 'i' } };
 *
 * // GOOD - safe from ReDoS
 * const safeInput = escapeRegex(userInput);
 * const query = { eventName: { $regex: safeInput, $options: 'i' } };
 *
 * SECURITY NOTE:
 * --------------
 * This function prevents ReDoS by ensuring user input is treated as
 * literal characters, not regex operators. Without this, attackers
 * could craft inputs that cause exponential backtracking.
 *
 * Attack example without escaping:
 * - User searches for: "(a+)+$" followed by many 'a' characters
 * - Regex tries to match, causing exponential time complexity
 * - Server hangs, denying service to other users
 */
export function escapeRegex(string) {
  // Handle null, undefined, and non-string inputs
  if (string == null) {
    return '';
  }

  if (typeof string !== 'string') {
    return String(string);
  }

  // Regular expression to match all special regex characters
  // Each special character is preceded by a backslash in the replacement
  //
  // Characters escaped: . * + ? ^ $ { } ( ) | [ ] \
  //
  // The pattern:
  // [.*+?^${}()|[\]\\]
  // - [...] is a character class matching any one of the characters inside
  // - \\ matches a literal backslash
  // - We use 'g' flag to replace all occurrences
  //
  // The replacement: '\\$&'
  // - $& is the entire matched string
  // - \\ adds a backslash before it
  //
  // Example: 'a+b' → character class matches '+' → replaced with '\+' → 'a\+b'
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// VALIDATE REGEX PATTERN
// =============================================================================

/**
 * isValidRegex(pattern)
 * ---------------------
 * Check if a string is a valid regular expression pattern.
 * Useful for validating admin-provided regex patterns.
 *
 * @param {string} pattern - The regex pattern to validate
 * @returns {boolean} - True if pattern is valid, false otherwise
 *
 * EXAMPLES:
 * isValidRegex('hello')      // Returns: true
 * isValidRegex('hello.*')    // Returns: true
 * isValidRegex('[a-z]+')     // Returns: true
 * isValidRegex('[unclosed')  // Returns: false
 * isValidRegex('(missing)')  // Returns: true
 * isValidRegex('(unclosed')  // Returns: false
 *
 * NOTE:
 * This does NOT protect against ReDoS - it only checks syntax validity.
 * For user input, always use escapeRegex() instead of validating.
 */
export function isValidRegex(pattern) {
  // Handle null, undefined, and non-string inputs
  if (pattern == null || typeof pattern !== 'string') {
    return false;
  }

  try {
    // Attempt to create a regex - throws if invalid syntax
    new RegExp(pattern);
    return true;
  } catch {
    // Invalid regex syntax
    return false;
  }
}

// =============================================================================
// CREATE SAFE REGEX
// =============================================================================

/**
 * createSafeRegex(userInput, options)
 * -----------------------------------
 * Create a regular expression from user input with safety measures.
 *
 * @param {string} userInput - User-provided search string
 * @param {Object} options - Configuration options
 *   - flags: Regex flags (default: 'i' for case-insensitive)
 *   - maxLength: Maximum input length (default: 100)
 *
 * @returns {RegExp|null} - Safe regex or null if input is invalid/too long
 *
 * EXAMPLES:
 * createSafeRegex('hello')           // Returns: /hello/i
 * createSafeRegex('hello.*world')    // Returns: /hello\.\*world/i (literal match)
 * createSafeRegex('test', { flags: '' })  // Returns: /test/ (case-sensitive)
 *
 * This function combines escaping with length limiting for defense in depth.
 */
export function createSafeRegex(userInput, options = {}) {
  const { flags = 'i', maxLength = 100 } = options;

  // Handle null, undefined, and non-string inputs
  if (userInput == null || typeof userInput !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = userInput.trim();

  // Reject empty inputs
  if (trimmed.length === 0) {
    return null;
  }

  // Reject overly long inputs (defense in depth)
  if (trimmed.length > maxLength) {
    return null;
  }

  // Escape special characters and create regex
  const escaped = escapeRegex(trimmed);

  try {
    return new RegExp(escaped, flags);
  } catch {
    // Should never happen since we escaped everything, but be safe
    return null;
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all functions as default object and named exports.
 *
 * USAGE:
 * // Named imports (preferred)
 * import { escapeRegex, createSafeRegex } from '../utils/regexHelper.js';
 *
 * // Default import
 * import regexHelper from '../utils/regexHelper.js';
 * regexHelper.escapeRegex(value);
 */
export default {
  escapeRegex,
  isValidRegex,
  createSafeRegex
};
