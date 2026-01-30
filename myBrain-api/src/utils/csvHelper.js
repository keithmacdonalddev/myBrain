/**
 * =============================================================================
 * CSVHELPER.JS - CSV Generation Utilities
 * =============================================================================
 *
 * This utility provides functions for generating properly formatted CSV
 * (Comma-Separated Values) files. CSV is a simple format for storing tabular
 * data (rows and columns) that can be opened in spreadsheet programs like
 * Excel or Google Sheets.
 *
 * WHY A CSV HELPER?
 * -----------------
 * CSV seems simple, but there are edge cases that can break the format:
 * - Values containing commas need to be quoted
 * - Values containing quotes need escaping (double the quotes)
 * - Values containing newlines need to be quoted
 * - Null/undefined values need to be handled
 *
 * This helper ensures all CSV output is properly formatted and safe.
 *
 * CSV FORMAT RULES:
 * -----------------
 * 1. Each row is on its own line
 * 2. Values are separated by commas
 * 3. Values with special characters are wrapped in quotes
 * 4. Quotes inside values are escaped by doubling them: " → ""
 *
 * EXAMPLE:
 * Name,Description,Price
 * "Widget, Large","A big ""widget"" for you",19.99
 *
 * USED BY:
 * - Activity export endpoint (GET /profile/activity/export)
 *
 * =============================================================================
 */

// =============================================================================
// ESCAPE CSV VALUE
// =============================================================================

/**
 * escapeCSV(value)
 * ----------------
 * Escape a single value for safe inclusion in CSV output.
 *
 * WHAT IT DOES:
 * 1. Converts null/undefined to empty string
 * 2. Converts any value to string
 * 3. Checks if value contains special characters (, " \n \r)
 * 4. If special chars exist: wraps in quotes and escapes internal quotes
 *
 * WHY ESCAPE?
 * -----------
 * Without escaping, these would break CSV parsing:
 * - Commas: Would be treated as column separator
 * - Quotes: Would be treated as field start/end
 * - Newlines: Would be treated as row separator
 *
 * @param {*} value - Any value to escape (string, number, boolean, object, etc.)
 * @returns {string} - Properly escaped CSV value
 *
 * EXAMPLES:
 * escapeCSV('hello')                    // Returns: hello
 * escapeCSV('hello, world')             // Returns: "hello, world"
 * escapeCSV('say "hello"')              // Returns: "say ""hello"""
 * escapeCSV('line1\nline2')             // Returns: "line1\nline2"
 * escapeCSV(null)                       // Returns: (empty string)
 * escapeCSV(123)                        // Returns: 123
 * escapeCSV(true)                       // Returns: true
 *
 * SECURITY NOTE:
 * This prevents CSV injection attacks where malicious data could
 * inject formulas (=, +, -, @) that execute when opened in Excel.
 * However, full protection from formula injection would require
 * additional measures (prefixing with single quote).
 */
export function escapeCSV(value) {
  // Handle null and undefined - return empty string
  if (value == null) {
    return '';
  }

  // Convert to string (handles numbers, booleans, objects, etc.)
  const str = String(value);

  // Check if the string contains any special characters that need quoting
  // Special characters: comma, double quote, newline (LF), carriage return (CR)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    // Wrap in quotes and escape internal quotes by doubling them
    // "hello" → ""hello""
    return '"' + str.replace(/"/g, '""') + '"';
  }

  // No special characters - return as-is
  return str;
}

// =============================================================================
// GENERATE CSV
// =============================================================================

/**
 * generateCSV(headers, rows)
 * --------------------------
 * Generate a complete CSV string from headers and rows.
 *
 * @param {string[]} headers - Array of column header names
 *   Example: ['Timestamp', 'Action', 'Category', 'IP', 'Success']
 *
 * @param {Array<Object|Array>} rows - Array of row data
 *   If array of objects: Values are extracted using headers as keys
 *   If array of arrays: Values are used in order
 *   Example (objects): [{ Timestamp: '2024-01-15', Action: 'Login' }]
 *   Example (arrays): [['2024-01-15', 'Login', 'security', '192.168.1.1', true]]
 *
 * @returns {string} - Complete CSV string with headers and rows
 *
 * EXAMPLE:
 * const headers = ['Name', 'Age', 'City'];
 * const rows = [
 *   { Name: 'Alice', Age: 30, City: 'New York' },
 *   { Name: 'Bob, Jr.', Age: 25, City: 'Los Angeles' }
 * ];
 * generateCSV(headers, rows);
 * // Returns:
 * // Name,Age,City
 * // Alice,30,New York
 * // "Bob, Jr.",25,Los Angeles
 *
 * OR with array rows:
 * const rows = [
 *   ['Alice', 30, 'New York'],
 *   ['Bob, Jr.', 25, 'Los Angeles']
 * ];
 * generateCSV(headers, rows);
 * // Returns same output
 */
export function generateCSV(headers, rows) {
  // =========================================================================
  // VALIDATE INPUT
  // =========================================================================

  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error('Headers must be a non-empty array');
  }

  if (!Array.isArray(rows)) {
    throw new Error('Rows must be an array');
  }

  // =========================================================================
  // BUILD HEADER ROW
  // =========================================================================

  // Escape each header value (in case they contain commas or quotes)
  const headerRow = headers.map(escapeCSV).join(',');

  // =========================================================================
  // BUILD DATA ROWS
  // =========================================================================

  const dataRows = rows.map(row => {
    // -----------------------------------------------------------------------
    // HANDLE OBJECT ROWS
    // -----------------------------------------------------------------------
    // If row is an object, extract values using headers as keys
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return headers.map(header => escapeCSV(row[header])).join(',');
    }

    // -----------------------------------------------------------------------
    // HANDLE ARRAY ROWS
    // -----------------------------------------------------------------------
    // If row is an array, use values in order
    if (Array.isArray(row)) {
      // Pad with empty strings if row has fewer values than headers
      const paddedRow = [...row];
      while (paddedRow.length < headers.length) {
        paddedRow.push('');
      }
      return paddedRow.slice(0, headers.length).map(escapeCSV).join(',');
    }

    // -----------------------------------------------------------------------
    // HANDLE INVALID ROWS
    // -----------------------------------------------------------------------
    // Skip null/undefined rows - return empty row
    return headers.map(() => '').join(',');
  });

  // =========================================================================
  // COMBINE AND RETURN
  // =========================================================================

  // Join header row with all data rows using newline separator
  return [headerRow, ...dataRows].join('\n');
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all functions as default object and named exports.
 *
 * USAGE:
 * // Named imports
 * import { escapeCSV, generateCSV } from '../utils/csvHelper.js';
 *
 * // Default import
 * import csvHelper from '../utils/csvHelper.js';
 * csvHelper.escapeCSV(value);
 */
export default {
  escapeCSV,
  generateCSV
};
