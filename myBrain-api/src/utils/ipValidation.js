/**
 * =============================================================================
 * IP VALIDATION UTILITY
 * =============================================================================
 *
 * This utility provides IP address validation functions for security purposes.
 * It's used throughout the application to ensure IP addresses are valid before:
 * - Storing in the database
 * - Using in rate limit whitelist
 * - Logging security events
 *
 * WHY VALIDATE IP ADDRESSES?
 * --------------------------
 * 1. SECURITY: Prevents injection of malicious strings
 * 2. DATA INTEGRITY: Ensures consistent IP format in database
 * 3. QUERY SAFETY: Prevents issues when searching by IP
 *
 * SUPPORTS:
 * - IPv4: 192.168.1.1
 * - IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
 * - IPv6 shorthand: ::1
 *
 * =============================================================================
 */

import validator from 'validator';

/**
 * isValidIP(ip)
 * -------------
 * Validates an IP address (IPv4 or IPv6).
 *
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP address
 *
 * EXAMPLES:
 * isValidIP('192.168.1.1')     // true
 * isValidIP('::1')             // true (IPv6 localhost)
 * isValidIP('not-an-ip')       // false
 * isValidIP('')                // false
 * isValidIP(null)              // false
 */
export function isValidIP(ip) {
  // Must be a non-empty string
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Use validator library to check IPv4 or IPv6
  const trimmedIP = ip.trim();
  return validator.isIP(trimmedIP);
}

/**
 * validateIP(ip)
 * --------------
 * Validates an IP address and returns the trimmed version.
 * Throws an error if the IP is invalid.
 *
 * @param {string} ip - IP address to validate
 * @returns {string} Trimmed, validated IP address
 * @throws {Error} If IP is invalid (with code 'INVALID_IP_FORMAT')
 *
 * USAGE:
 * try {
 *   const cleanIP = validateIP(userInput);
 *   // cleanIP is guaranteed valid
 * } catch (e) {
 *   // Handle invalid IP
 * }
 */
export function validateIP(ip) {
  if (!isValidIP(ip)) {
    const error = new Error('Invalid IP address format');
    error.code = 'INVALID_IP_FORMAT';
    throw error;
  }
  return ip.trim();
}

/**
 * ipValidator
 * -----------
 * Mongoose validator object for IP fields in schemas.
 *
 * USAGE IN SCHEMA:
 * import { ipValidator } from '../utils/ipValidation.js';
 *
 * const schema = new mongoose.Schema({
 *   ip: {
 *     type: String,
 *     required: true,
 *     validate: ipValidator
 *   }
 * });
 */
export const ipValidator = {
  validator: (v) => isValidIP(v),
  message: 'Invalid IP address format'
};

/**
 * validateIPArray(ips, maxCount)
 * ------------------------------
 * Validates an array of IP addresses.
 * Used for validating trustedIPs array in SystemSettings.
 *
 * @param {string[]} ips - Array of IP addresses
 * @param {number} maxCount - Maximum allowed IPs (default: 100)
 * @returns {boolean} True if all IPs valid and within count
 *
 * USAGE:
 * const isValid = validateIPArray(['192.168.1.1', '10.0.0.1'], 100);
 */
export function validateIPArray(ips, maxCount = 100) {
  // Must be an array
  if (!Array.isArray(ips)) {
    return false;
  }

  // Check count limit
  if (ips.length > maxCount) {
    return false;
  }

  // All entries must be valid IPs
  return ips.every(ip => isValidIP(ip));
}

/**
 * ipArrayValidator
 * ----------------
 * Mongoose validator for arrays of IP addresses.
 * Validates each IP in the array and enforces a maximum count.
 *
 * USAGE IN SCHEMA:
 * import { ipArrayValidator } from '../utils/ipValidation.js';
 *
 * trustedIPs: {
 *   type: [String],
 *   default: [],
 *   validate: ipArrayValidator
 * }
 */
export const ipArrayValidator = {
  validator: function(arr) {
    return validateIPArray(arr, 100);
  },
  message: 'Invalid IP address in list or array exceeds 100 items'
};
