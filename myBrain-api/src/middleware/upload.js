/**
 * =============================================================================
 * UPLOAD.JS - File Upload Middleware
 * =============================================================================
 *
 * This file provides middleware for handling file uploads in myBrain.
 * It uses the Multer library to process file uploads with validation.
 *
 * WHAT IS MULTER?
 * ---------------
 * Multer is a popular Node.js middleware for handling multipart/form-data,
 * which is the encoding type used when uploading files through HTML forms.
 * It parses the incoming file data and makes it available on req.file.
 *
 * TWO UPLOAD TYPES:
 * -----------------
 * 1. IMAGE UPLOADS: Strict validation, smaller size limit (5MB)
 *    - Used for: User avatars, image gallery
 *    - Allowed: JPEG, PNG, GIF, WebP only
 *
 * 2. FILE UPLOADS: Less strict, larger size limit (100MB)
 *    - Used for: General file storage (Files feature)
 *    - Blocked: Dangerous executable files
 *
 * MEMORY STORAGE:
 * ---------------
 * Files are stored in memory (RAM) temporarily during upload.
 * After processing, they're typically uploaded to cloud storage (S3/Cloudinary).
 *
 * WHY MEMORY STORAGE?
 * - Faster processing (no disk I/O)
 * - Cleaner (no temp files to clean up)
 * - Works well with cloud storage upload
 * - Note: Not suitable for very large files (100MB+ uses significant RAM)
 *
 * SECURITY FEATURES:
 * ------------------
 * 1. FILE TYPE VALIDATION: Only allow safe file types
 * 2. SIZE LIMITS: Prevent excessively large uploads
 * 3. EXECUTABLE BLOCKING: Block dangerous file types (.exe, .bat, etc.)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Multer is the file upload middleware for Node.js.
 * It handles multipart/form-data parsing and file storage.
 */
import multer from 'multer';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * ALLOWED_IMAGE_MIMETYPES
 * -----------------------
 * MIME types allowed for image uploads.
 * Only these image formats are accepted.
 *
 * WHY THESE FORMATS?
 * - JPEG: Most common, good compression, photos
 * - PNG: Lossless, supports transparency
 * - GIF: Animations, simple graphics
 * - WebP: Modern format, best compression
 */
const ALLOWED_IMAGE_MIMETYPES = [
  'image/jpeg',  // .jpg, .jpeg files
  'image/png',   // .png files
  'image/gif',   // .gif files (including animated)
  'image/webp',  // .webp files
];

/**
 * FORBIDDEN_EXTENSIONS
 * --------------------
 * File extensions that are NEVER allowed.
 * These are potentially dangerous executable files.
 *
 * SECURITY RISK:
 * If someone uploaded a .exe file and it was somehow served
 * to other users, it could be a malware distribution vector.
 *
 * LIST INCLUDES:
 * - Windows executables: .exe, .bat, .cmd, .msi, .dll, .scr
 * - Scripts: .sh, .ps1, .vbs, .js, .hta
 * - Java: .jar
 * - Other dangerous: .com, .pif, .cpl, .msc
 */
const FORBIDDEN_EXTENSIONS = [
  '.exe',   // Windows executable
  '.bat',   // Windows batch file
  '.cmd',   // Windows command script
  '.sh',    // Unix shell script
  '.ps1',   // PowerShell script
  '.vbs',   // VBScript
  '.js',    // JavaScript (could be Node.js script)
  '.jar',   // Java archive (executable)
  '.msi',   // Windows installer
  '.dll',   // Dynamic link library
  '.scr',   // Windows screensaver (executable)
  '.com',   // DOS executable
  '.pif',   // Windows shortcut (can run programs)
  '.hta',   // HTML Application (has full system access)
  '.cpl',   // Control Panel extension
  '.msc',   // Microsoft Management Console
];

/**
 * FILE SIZE LIMITS
 * ----------------
 * Maximum file sizes for different upload types.
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB - enough for high-res photos
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB - for documents, PDFs, etc.

// =============================================================================
// MULTER STORAGE CONFIGURATION
// =============================================================================

/**
 * Memory Storage
 * --------------
 * Store uploaded files in memory (Buffer) rather than on disk.
 *
 * AFTER UPLOAD:
 * - req.file.buffer contains the file data
 * - req.file.originalname has the original filename
 * - req.file.mimetype has the MIME type
 * - req.file.size has the file size in bytes
 */
const storage = multer.memoryStorage();

// =============================================================================
// FILE FILTERS
// =============================================================================

/**
 * imageFileFilter(req, file, cb)
 * ------------------------------
 * Filter function for image uploads.
 * Only allows specific image MIME types.
 *
 * @param {Request} req - Express request object
 * @param {Object} file - File info from Multer
 * @param {Function} cb - Callback function
 *   - cb(null, true) - Accept the file
 *   - cb(new Error('...'), false) - Reject the file
 */
const imageFileFilter = (req, file, cb) => {
  // Check if file's MIME type is in our allowed list
  if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);  // Accept the file
  } else {
    // Reject with helpful error message
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'), false);
  }
};

/**
 * generalFileFilter(req, file, cb)
 * --------------------------------
 * Filter function for general file uploads.
 * Blocks dangerous executable files, allows everything else.
 *
 * @param {Request} req - Express request object
 * @param {Object} file - File info from Multer
 * @param {Function} cb - Callback function
 */
const generalFileFilter = (req, file, cb) => {
  // Get filename in lowercase for comparison
  const filename = file.originalname.toLowerCase();

  // Check if filename ends with any forbidden extension
  const isForbidden = FORBIDDEN_EXTENSIONS.some(ext => filename.endsWith(ext));

  if (isForbidden) {
    cb(new Error('This file type is not allowed for security reasons.'), false);
  } else {
    cb(null, true);  // Accept the file
  }
};

// =============================================================================
// MULTER INSTANCES
// =============================================================================

/**
 * imageUpload
 * -----------
 * Multer instance configured for image uploads.
 * - Uses memory storage
 * - Only accepts image MIME types
 * - Max 5MB file size
 */
const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
});

/**
 * fileUpload
 * ----------
 * Multer instance configured for general file uploads.
 * - Uses memory storage
 * - Blocks dangerous executables
 * - Max 100MB file size
 */
const fileUpload = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// =============================================================================
// MIDDLEWARE EXPORTS
// =============================================================================

/**
 * uploadSingle
 * ------------
 * Middleware for single image upload.
 * Field name in form: "image"
 *
 * USAGE:
 * router.post('/avatar', requireAuth, uploadSingle, handleAvatarUpload);
 *
 * HTML FORM:
 * <input type="file" name="image" accept="image/*">
 *
 * AFTER THIS MIDDLEWARE:
 * - req.file contains the uploaded image
 * - req.file.buffer has the image data
 */
export const uploadSingle = imageUpload.single('image');

/**
 * uploadFileSingle
 * ----------------
 * Middleware for single file upload (any allowed type).
 * Field name in form: "file"
 *
 * USAGE:
 * router.post('/files', requireAuth, uploadFileSingle, handleFileUpload);
 *
 * HTML FORM:
 * <input type="file" name="file">
 */
export const uploadFileSingle = fileUpload.single('file');

/**
 * uploadFileMultiple
 * ------------------
 * Middleware for multiple file uploads (up to 10 files).
 * Field name in form: "files"
 *
 * USAGE:
 * router.post('/files/batch', requireAuth, uploadFileMultiple, handleBatchUpload);
 *
 * HTML FORM:
 * <input type="file" name="files" multiple>
 *
 * AFTER THIS MIDDLEWARE:
 * - req.files is an array of uploaded files
 */
export const uploadFileMultiple = fileUpload.array('files', 10);

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * handleUploadError(err, req, res, next)
 * --------------------------------------
 * Error handling middleware for Multer errors.
 * Should be used AFTER upload middleware.
 *
 * HANDLES:
 * - LIMIT_FILE_SIZE: File too large
 * - Other Multer errors: General upload failures
 * - Non-Multer errors: Passes to next error handler
 *
 * USAGE:
 * router.post('/images',
 *   uploadSingle,
 *   handleUploadError,  // <-- Handle upload errors
 *   processImage
 * );
 *
 * @param {Error} err - Error from Multer or other middleware
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
export const handleUploadError = (err, req, res, next) => {
  // Check if it's a Multer-specific error
  if (err instanceof multer.MulterError) {
    // File size exceeded
    if (err.code === 'LIMIT_FILE_SIZE') {
      // Determine which limit was exceeded based on field name
      const isImageUpload = err.field === 'image';
      const maxSize = isImageUpload ? '5MB' : '100MB';

      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize}.`,
        code: 'FILE_TOO_LARGE',
      });
    }

    // Other Multer errors (too many files, unexpected field, etc.)
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  // Non-Multer error (like our custom validation errors)
  if (err) {
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  // No error - continue to next middleware
  next();
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export the image upload instance as default.
 * Individual middleware functions are also exported as named exports.
 *
 * USAGE:
 *
 * // Named exports (recommended)
 * import { uploadSingle, uploadFileSingle, handleUploadError } from './middleware/upload.js';
 *
 * // Default export (for image uploads)
 * import imageUpload from './middleware/upload.js';
 *
 * TYPICAL ROUTE SETUP:
 * router.post('/avatar', requireAuth, uploadSingle, handleUploadError, uploadAvatar);
 * router.post('/files', requireAuth, uploadFileSingle, handleUploadError, uploadFile);
 */
export default imageUpload;
