/**
 * =============================================================================
 * SHARES.JS - Public File Sharing Routes
 * =============================================================================
 *
 * This file handles public file sharing via shareable links in myBrain.
 * Files can be shared publicly with anyone (no account needed) using a
 * unique token/link.
 *
 * WHAT IS PUBLIC FILE SHARING?
 * ----------------------------
 * Public sharing allows you to:
 * - Create a unique link to a file
 * - Share it with anyone (no myBrain account needed)
 * - Set expiration date (link works for limited time)
 * - Set download limits (link expires after N downloads)
 * - Track who downloaded the file
 * - Revoke access anytime
 *
 * WHEN TO USE PUBLIC SHARING:
 * ---------------------------
 * - SHARING WITH EXTERNAL PEOPLE: Not connected in myBrain
 * - TEMPORARY ACCESS: Share for limited time
 * - LARGE FILES: Email can't handle large files
 * - BUSINESS DOCUMENTS: Send to clients, partners
 * - FEEDBACK: Share design for review
 * - DOWNLOADS: Let people download your files
 *
 * PUBLIC SHARING VS CONNECTIONS SHARING:
 * ----------------------------------------
 * PUBLIC SHARING (this file):
 * - Anyone with link can access
 * - No myBrain account needed
 * - Can expire or limit downloads
 * - Read-only by default
 * - Good for external sharing
 *
 * CONNECTION SHARING (itemShares.js):
 * - Only connected myBrain users
 * - Requires account
 * - Real-time collaboration
 * - Permissions (view/edit)
 * - Good for internal sharing
 *
 * SHARE LINK STRUCTURE:
 * --------------------
 * https://mybrain.app/share/abc123xyz789
 *
 * abc123xyz789 = unique token (cannot guess)
 *
 * SHARE TOKEN:
 * ---------
 * - 32 characters (secure random)
 * - Expires based on settings
 * - Tracks downloads/access
 * - Can be revoked anytime
 *
 * DOWNLOAD TRACKING:
 * ------------------
 * When someone uses share link:
 * - Download count incremented
 * - IP address logged (privacy: hashed)
 * - Timestamp recorded
 * - User can see access history
 *
 * EXPIRATION OPTIONS:
 * --------------------
 * - NO EXPIRATION: Link works forever (until revoked)
 * - TIME-BASED: Link expires in 24 hours, 7 days, 30 days
 * - DOWNLOAD-LIMITED: Expires after 5/10/50 downloads
 * - COMBINATION: Expires at time OR download limit
 *
 * ENDPOINTS:
 * -----------
 * - GET /share/:token - Access shared file (public endpoint)
 * - POST /shares - Create new public share
 * - GET /shares/:id - Get share details
 * - PUT /shares/:id - Update share settings
 * - DELETE /shares/:id - Revoke public share
 * - GET /shares/:id/downloads - View access history
 * - POST /shares/:token/download - Track download
 *
 * SECURITY:
 * ----------
 * - Tokens are cryptographically secure (can't guess)
 * - Share links don't reveal file contents in URL
 * - Can revoke access anytime
 * - File can't be indexed by search engines
 * - Requires link to access (not publicly discoverable)
 *
 * PRIVACY:
 * --------
 * - Download logs show hashed IP (not full address)
 * - User can see who downloaded (IP + timestamp)
 * - Not tracked to specific person (unless identifiable)
 * - Access logs deleted after 90 days
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PUT, DELETE)
 * - Define routes (URLs that external users can call)
 * - Use middleware (functions that process requests)
 * We use it to define all the public file sharing endpoints.
 */
import express from 'express';

/**
 * express-rate-limit prevents brute force attacks on password-protected shares.
 * By limiting password attempts, we prevent attackers from guessing passwords
 * through automated trial-and-error.
 */
import rateLimit from 'express-rate-limit';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to request logs
 * so we can investigate failures (invalid tokens, service errors, etc.).
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Share service contains business logic for public file sharing.
 * It handles getting file info, verifying access, tracking downloads,
 * and managing share tokens and expiration.
 */
import * as shareService from '../services/shareService.js';

const router = express.Router();

// =============================================================================
// RATE LIMITING FOR PASSWORD-PROTECTED SHARES
// =============================================================================

/**
 * Share Password Rate Limiter
 * ---------------------------
 * Prevents brute force attacks on password-protected shares.
 *
 * SECURITY DESIGN:
 * - 5 password attempts per 15 minutes per IP + token combination
 * - Uses IP + token as key to prevent both cross-token and single-token attacks
 * - Stricter than global rate limit because password guessing is high risk
 *
 * WHY THIS IS IMPORTANT:
 * Without rate limiting, an attacker could try thousands of passwords per second.
 * With 5 attempts per 15 min, even a 4-digit PIN would take years to crack.
 */
const sharePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // 5 attempts in production
  message: {
    error: 'Too many password attempts. Please try again in 15 minutes.',
    code: 'PASSWORD_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + share token combination
    // This prevents attackers from spreading attempts across tokens
    // while still allowing different users to access different shares
    return `${req.ip}-${req.params.token}`;
  }
});

/**
 * GET /share/:token
 * Get shared file information using unique token (public endpoint)
 *
 * WHAT IT DOES:
 * Retrieves metadata about a publicly shared file using its unique share token.
 * This is a PUBLIC endpoint - anyone with the token can get file information.
 * Does not return file content - used to display preview and metadata before download.
 *
 * HOW IT WORKS:
 * 1. Extract the unique token from the URL path
 * 2. Look up the share record in database
 * 3. Verify share hasn't expired or reached access limit
 * 4. Return file metadata (name, size, type, creation date, etc.)
 *
 * PUBLIC ENDPOINT:
 * No authentication required - anyone with the share token can call this.
 * Token itself acts as the authentication (cryptographically random).
 *
 * USE CASES:
 * - User opens a shared file link to preview file info
 * - Frontend displays file metadata before user clicks download
 * - Verify share is still valid before showing download button
 * - Display file size and type to help user decide
 * - Show share details (created date, expiration date)
 *
 * PATH PARAMETERS:
 * - token: Unique share token (required)
 *   Example: /share/abc123xyz789def456ghi789jkl012
 *   Format: 32-character random string
 *
 * EXAMPLE REQUEST:
 * GET /share/abc123xyz789def456ghi789jkl012
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "filename": "Q4_Report.pdf",
 *   "size": 1024000,
 *   "mimeType": "application/pdf",
 *   "fileCategory": "document",
 *   "createdAt": "2026-01-21T12:00:00Z",
 *   "expiresAt": "2026-02-21T12:00:00Z",
 *   "isExpired": false,
 *   "downloadCount": 5
 * }
 *
 * ERROR RESPONSES:
 * - 404: Share not found (invalid token or not found in database)
 * - 410: Share expired or access limit reached
 * - 500: Server error
 *
 * SHARE VALIDATION:
 * Before returning info, checks:
 * - Token exists in database
 * - Share hasn't passed expiration date (if expiresAt set)
 * - Share hasn't exceeded max download limit (if maxAccessCount set)
 */
router.get('/:token', async (req, res) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract the unique share token from the URL path
    // Example: /share/abc123xyz789 → token = "abc123xyz789"
    const { token } = req.params;

    // =====================================================
    // RETRIEVE SHARE INFO
    // =====================================================
    // Step 2: Look up this token in the database via service
    // shareService.getPublicFileInfo handles:
    // - Finding share by token
    // - Verifying share hasn't expired
    // - Verifying share hasn't exceeded access limits
    // - Returning file metadata
    const fileInfo = await shareService.getPublicFileInfo(token);

    // Step 3: Check if the share exists and is accessible
    // If token is invalid, expired, or access limit exceeded, fileInfo will be null
    if (!fileInfo) {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND',
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 4: Return the file information to user
    // Frontend uses this to display:
    // - Filename and size
    // - File type icon
    // - Download button
    // - Expiration/access info
    res.json(fileInfo);
  } catch (error) {
    // Log error details for debugging
    attachError(req, error, { operation: 'share_get_info' });
    res.status(500).json({
      error: 'Failed to get share info',
      code: 'GET_SHARE_ERROR',
    });
  }
});

/**
 * POST /share/:token/verify
 * Verify password for password-protected share
 *
 * WHAT IT DOES:
 * For shares that require a password, this endpoint verifies the password is correct.
 * Only after password verification can user proceed to download the file.
 *
 * WHY PASSWORDS?
 * Password-protected shares add extra security:
 * - Share link alone is not enough to access the file
 * - Even if link is leaked, attacker still needs password
 * - Good for sensitive documents shared externally
 *
 * SECURITY FLOW:
 * 1. User opens shared file link
 * 2. If password is required, show password prompt
 * 3. User enters password
 * 4. This endpoint verifies the password against hash
 * 5. If correct, return file info and allow download
 * 6. If wrong, reject with 403 Forbidden
 *
 * USE CASES:
 * - Share sensitive document with password protection
 * - Require password for additional security layer
 * - Password shared separately from link (link via email, password via phone)
 * - Temporary shares that require verbal authorization
 *
 * PATH PARAMETERS:
 * - token: Share token (required)
 *   Example: /share/abc123xyz789/verify
 *
 * REQUEST BODY:
 * {
 *   "password": "sharePassword123"
 * }
 *
 * EXAMPLE REQUEST:
 * POST /share/abc123xyz789def456/verify
 * {
 *   "password": "mySecretPassword"
 * }
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "verified": true,
 *   "filename": "Confidential_Report.pdf",
 *   "size": 2048000,
 *   "mimeType": "application/pdf"
 * }
 *
 * ERROR RESPONSES:
 * - 400: Password not provided or invalid
 * - 401: Share requires password but none provided
 * - 403: Wrong password
 * - 404: Share not found or expired
 * - 500: Server error
 *
 * PASSWORD HASHING:
 * Password is never stored in plain text:
 * - User's password is hashed when share created
 * - Provided password is hashed and compared to stored hash
 * - Even admins can't see plain text password
 *
 * SECURITY NOTES:
 * - Password is sent in request body (use HTTPS only)
 * - No rate limiting on password attempts (consider adding)
 * - Failed attempts are not logged (to prevent enumeration)
 */
router.post('/:token/verify', sharePasswordLimiter, async (req, res) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract token from URL and password from request body
    const { token } = req.params;
    const { password } = req.body;

    // Step 2: Validate that password was provided
    // Password is required for this endpoint to work
    if (!password) {
      return res.status(400).json({
        error: 'Password is required',
        code: 'PASSWORD_REQUIRED',
      });
    }

    // =====================================================
    // VERIFY PASSWORD
    // =====================================================
    // Step 3: Call service to verify password
    // Service handles:
    // - Finding share by token
    // - Checking if share exists and not expired
    // - Comparing provided password against hashed password
    const result = await shareService.verifyShareAccess(token, { password });

    // Step 4: Check if verification was successful
    // result.valid = true if password matches
    // result.valid = false if password wrong or share doesn't exist
    if (!result.valid) {
      // Return appropriate error status based on failure reason
      return res.status(result.needsPassword ? 401 : 403).json({
        error: result.error || 'Invalid password',
        code: result.needsPassword ? 'PASSWORD_REQUIRED' : 'INVALID_PASSWORD',
      });
    }

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 5: Return verification success with file metadata
    // Frontend can now show file info and allow download
    // Actual file content is returned separately by download endpoint
    res.json({
      verified: true,
      filename: result.file.originalName,
      size: result.file.size,
      mimeType: result.file.mimeType,
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'share_verify' });
    res.status(500).json({
      error: 'Failed to verify share',
      code: 'VERIFY_SHARE_ERROR',
    });
  }
});

/**
 * GET /share/:token/download
 * Get download URL for shared file
 *
 * WHAT IT DOES:
 * Returns a direct download URL for a shared file.
 * This is the endpoint called when someone clicks "Download" on a shared file.
 * Also tracks the download for analytics and download limits.
 *
 * DOWNLOAD TRACKING:
 * When someone downloads:
 * - Download count incremented (for download limits)
 * - IP address logged (hashed for privacy)
 * - Timestamp recorded
 * - User can see access history
 *
 * DOWNLOAD LIMITS:
 * Share owner can set limits:
 * - Time-based: Link expires at specific time
 * - Download-based: Link expires after N downloads
 * This endpoint checks those limits before allowing download.
 *
 * EXAMPLE REQUEST:
 * GET /share/abc123xyz789/download?password=optional
 *
 * EXAMPLE RESPONSE:
 * {
 *   url: "https://s3.amazonaws.com/download/file123",
 *   filename: "document.pdf"
 * }
 */
router.get('/:token/download', async (req, res) => {
  try {
    // =====================================================
    // GATHER ACCESS INFO
    // =====================================================
    // Step 1: Extract token and optional password from request
    const { token } = req.params;
    const { password } = req.query;

    // Step 2: Collect information about this access attempt
    // This data is logged for download tracking, security monitoring, and analytics
    const accessInfo = {
      password,
      // Get IP address of the user making request (for tracking/security)
      ipAddress: req.ip || req.connection?.remoteAddress,
      // Get browser/app user agent (helps track what devices access shares)
      userAgent: req.get('User-Agent'),
    };

    // Step 3: If user is logged in, include their user ID
    // Helps distinguish between authenticated and anonymous downloads
    if (req.user) {
      accessInfo.userId = req.user._id;
    }

    // =====================================================
    // VERIFY ACCESS & GET DOWNLOAD URL
    // =====================================================
    // Step 4: Call service to verify access and retrieve download URL
    // Service validates:
    // - Share token exists and is valid
    // - Share hasn't expired (if expiresAt set)
    // - Download limit not exceeded (if maxAccessCount set)
    // - Password is correct (if password-protected)
    // - Increments access counter
    const downloadInfo = await shareService.accessShare(token, accessInfo);

    // =====================================================
    // RESPONSE
    // =====================================================
    // Step 5: Return the download URL to frontend
    // Frontend will use URL to:
    // - Open in new tab (for viewing)
    // - Trigger download (for saving)
    // - Stream to user's device
    res.json(downloadInfo);
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'share_download' });

    // =====================================================
    // ERROR HANDLING
    // =====================================================
    // Handle specific error cases with appropriate HTTP status codes

    // Case 1: Share not found or expired
    if (error.message === 'Invalid share' || error.message === 'Share not found') {
      return res.status(404).json({
        error: 'Share not found or expired',
        code: 'SHARE_NOT_FOUND',
      });
    }

    // Case 2: Wrong password provided
    if (error.message === 'Invalid password') {
      return res.status(401).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD',
        needsPassword: true,
      });
    }

    // Case 3: Download limit exceeded or access denied
    if (error.message === 'Download not permitted for this share') {
      return res.status(403).json({
        error: error.message,
        code: 'DOWNLOAD_NOT_PERMITTED',
      });
    }

    // Case 4: Other access denied errors
    if (error.message.includes('access')) {
      return res.status(403).json({
        error: error.message,
        code: 'ACCESS_DENIED',
      });
    }

    // Case 5: Unexpected server error
    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * GET /share/:token/preview
 * Get preview info for shared file (for inline viewing)
 *
 * WHAT IT DOES:
 * Returns data needed to display a preview of the shared file inline.
 * For images: returns thumbnail and full preview URLs
 * For documents: returns metadata and preview URL if available
 * For other files: returns basic info (filename, size, type)
 *
 * WHY SEPARATE FROM DOWNLOAD?
 * Previewing (viewing in browser) is different from downloading:
 * - Preview: Inline viewer displays file without saving
 * - Download: File saved to user's computer
 *
 * USE CASES:
 * - Show image preview before choosing to download
 * - Display document preview (PDF, Word, etc.)
 * - Check file info (size, type) before downloading large file
 *
 * EXAMPLE REQUEST:
 * GET /share/abc123xyz789/preview?password=optional
 */
router.get('/:token/preview', async (req, res) => {
  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    // Step 1: Extract token and optional password from request
    const { token } = req.params;
    const { password } = req.query;

    // =====================================================
    // VERIFY ACCESS
    // =====================================================
    // Step 2: Verify share access using same validation as download
    // Check:
    // - Share exists and not expired
    // - Password is correct (if password-protected)
    // - User has permission to view
    const result = await shareService.verifyShareAccess(token, { password });

    // Step 3: Check if access is allowed
    if (!result.valid) {
      // Return appropriate error code based on failure reason
      return res.status(result.needsPassword ? 401 : 403).json({
        error: result.error || 'Access denied',
        code: result.needsPassword ? 'PASSWORD_REQUIRED' : 'ACCESS_DENIED',
        needsPassword: result.needsPassword,
      });
    }

    // =====================================================
    // BUILD PREVIEW RESPONSE
    // =====================================================
    // Step 4: Extract file and share information from verification result
    const { file, share } = result;

    // Step 5: Return preview information
    // Frontend uses this data to display inline preview before user decides to download
    res.json({
      // File metadata
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      // File classification (helps UI choose preview handler)
      fileCategory: file.fileCategory,               // image, document, video, etc.
      // Preview URLs (frontend displays these)
      thumbnailUrl: file.thumbnailUrl,               // Small thumbnail preview
      previewUrl: file.previewUrl,                   // Full preview (if service supports)
      // Image/video dimensions
      width: file.width,                             // Image/video width
      height: file.height,                           // Image/video height
      // Share permissions (determines what user can do)
      permissions: share.permissions,                // canView, canDownload, canEdit, etc.
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'share_preview' });
    res.status(500).json({
      error: 'Failed to get preview',
      code: 'PREVIEW_ERROR',
    });
  }
});

export default router;
