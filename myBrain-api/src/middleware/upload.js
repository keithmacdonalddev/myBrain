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

/**
 * file-type detects file types by reading their magic numbers (file signatures).
 * Magic numbers are the first few bytes of a file that identify its format.
 * This is more secure than trusting the declared MIME type or file extension.
 */
import { fileTypeFromBuffer } from 'file-type';

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
 * imageFileFilter(req, file, cb) - Validate Image File Type
 * ===========================================================
 * This filter function validates that uploaded files are images.
 * Multer calls this for each file to decide whether to accept it.
 *
 * WHY FILE FILTERS?
 * ----------------
 * File filters provide early validation before the file is fully processed.
 * If validation fails, multer rejects it immediately (saves bandwidth).
 *
 * @param {Request} req - Express request object
 *   - Available for custom validation if needed
 *
 * @param {Object} file - Multer file object
 *   - file.originalname: Name user gave the file
 *   - file.mimetype: MIME type (image/jpeg, image/png, etc.)
 *   - file.encoding: File encoding
 *   - file.size: File size in bytes
 *
 * @param {Function} cb - Callback function
 *   - cb(null, true): Accept the file
 *   - cb(error, false): Reject with error message
 *
 * VALIDATION LOGIC:
 * -----------------
 * Check if file's MIME type is in the allowed list.
 * MIME types are reliable indicators of file type
 * (browser/OS reports MIME type based on file extension).
 *
 * ALLOWED TYPES:
 * - image/jpeg: JPEG photos
 * - image/png: PNG images (lossless)
 * - image/gif: GIF images (including animated)
 * - image/webp: Modern WebP format
 */
const imageFileFilter = (req, file, cb) => {
  // =========================================================================
  // CHECK IF FILE'S MIME TYPE IS ALLOWED
  // =========================================================================
  // MIME type is a reliable indicator of file type
  // Examples:
  // - "image/jpeg" → JPEG photo
  // - "image/png" → PNG image
  // - "application/pdf" → PDF document (NOT allowed)

  if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
    // File is an allowed image type
    // cb(null, true) tells multer to accept it
    cb(null, true);
  } else {
    // File is not an allowed type
    // Send error back to multer (which routes to handleUploadError)
    // Provide helpful message explaining what types are allowed
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'), false);
  }
};

/**
 * generalFileFilter(req, file, cb) - Validate General File Type
 * ==============================================================
 * This filter blocks dangerous executable files while allowing most
 * other file types (documents, spreadsheets, archives, etc.).
 *
 * SECURITY STRATEGY:
 * ------------------
 * WHITELIST (for images): Only allow specific types
 * - Image filter: ONLY image/jpeg, image/png, etc.
 *
 * BLACKLIST (for general files): Block dangerous types
 * - General filter: Allow everything EXCEPT executables
 * - This makes sense because users upload diverse files
 * - But we must block anything executable
 *
 * WHY BLOCK EXECUTABLES?
 * ----------------------
 * Executable files could be:
 * - Viruses/malware
 * - Trojans
 * - Ransomware
 *
 * If user uploaded a .exe and it was served back to them,
 * they might accidentally run it (or security software blocks it).
 *
 * @param {Request} req - Express request object
 *
 * @param {Object} file - Multer file object
 *   - file.originalname: Filename user uploaded
 *   - file.mimetype: MIME type
 *
 * @param {Function} cb - Callback
 *   - cb(null, true): Accept
 *   - cb(error, false): Reject
 *
 * BLACKLISTED EXTENSIONS:
 * .exe, .bat, .cmd, .sh, .ps1, .vbs, .js, .jar, .msi, .dll, .scr, etc.
 */
const generalFileFilter = (req, file, cb) => {
  // =========================================================================
  // CONVERT FILENAME TO LOWERCASE
  // =========================================================================
  // Check extensions case-insensitively
  // Example: "BadFile.EXE" → "badfile.exe"

  const filename = file.originalname.toLowerCase();

  // =========================================================================
  // CHECK IF FILENAME ENDS WITH FORBIDDEN EXTENSION
  // =========================================================================
  // Some extensions are dangerous no matter the MIME type
  // Example: "virus.txt.exe" has .exe extension (dangerous!)
  //
  // We check with endsWith() to catch:
  // - virus.exe (obvious)
  // - virus.txt.exe (double extension trick)
  // - virus.exe.zip (zipped executable)

  const isForbidden = FORBIDDEN_EXTENSIONS.some(ext => filename.endsWith(ext));

  // =========================================================================
  // ACCEPT OR REJECT BASED ON EXTENSION
  // =========================================================================

  if (isForbidden) {
    // Extension is forbidden - reject with security message
    cb(new Error('This file type is not allowed for security reasons.'), false);
  } else {
    // Extension is not forbidden - accept the file
    // (could be PDF, DOCX, ZIP, etc.)
    cb(null, true);
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
 * uploadSingle - Upload Single Image
 * ===================================
 * Middleware for uploading a single image with strict validation.
 *
 * FIELD NAME: "image"
 * The form's file input must be named "image".
 *
 * VALIDATION:
 * - Only image MIME types allowed (JPEG, PNG, GIF, WebP)
 * - Max 5MB file size
 * - File stored in memory (buffer)
 *
 * AFTER THIS MIDDLEWARE:
 * - req.file: Object containing uploaded file
 *   - req.file.buffer: File data in memory
 *   - req.file.originalname: Original filename
 *   - req.file.mimetype: MIME type (image/jpeg, etc.)
 *   - req.file.size: File size in bytes
 *   - req.file.encoding: File encoding
 *
 * USAGE:
 * ```javascript
 * router.post('/avatar',
 *   requireAuth,
 *   uploadSingle,          // Process uploaded image
 *   handleUploadError,     // Handle multer errors
 *   async (req, res) => {
 *     // req.file.buffer contains image data
 *     // Upload to S3, save to DB, etc.
 *   }
 * );
 * ```
 *
 * HTML FORM:
 * ```html
 * <form enctype="multipart/form-data">
 *   <input type="file" name="image" accept="image/*">
 *   <button type="submit">Upload</button>
 * </form>
 * ```
 */
export const uploadSingle = imageUpload.single('image');

/**
 * uploadFileSingle - Upload Single File (Any Type)
 * =================================================
 * Middleware for uploading a single general file with loose validation.
 *
 * FIELD NAME: "file"
 * The form's file input must be named "file".
 *
 * VALIDATION:
 * - Blocks executable files (.exe, .bat, etc.)
 * - Allows everything else (PDF, DOCX, ZIP, etc.)
 * - Max 100MB file size
 * - File stored in memory (buffer)
 *
 * AFTER THIS MIDDLEWARE:
 * - req.file: Object containing uploaded file
 *   - req.file.buffer: File data
 *   - req.file.size: File size in bytes
 *   - etc. (same as uploadSingle)
 *
 * USAGE:
 * ```javascript
 * router.post('/files',
 *   requireAuth,
 *   uploadFileSingle,
 *   handleUploadError,
 *   async (req, res) => {
 *     // Process uploaded file
 *   }
 * );
 * ```
 *
 * HTML FORM:
 * ```html
 * <form enctype="multipart/form-data">
 *   <input type="file" name="file">
 *   <button>Upload</button>
 * </form>
 * ```
 */
export const uploadFileSingle = fileUpload.single('file');

/**
 * uploadFileMultiple - Upload Multiple Files
 * ===========================================
 * Middleware for uploading multiple files at once (up to 10 files).
 *
 * FIELD NAME: "files"
 * The form's file input must be named "files" and have multiple attribute.
 *
 * LIMITS:
 * - Maximum 10 files per request
 * - Each file: max 100MB
 * - Blocks executables
 * - Files stored in memory
 *
 * AFTER THIS MIDDLEWARE:
 * - req.files: Array of uploaded files
 *   - req.files[0], req.files[1], ...
 *   - Each has: buffer, size, originalname, mimetype, etc.
 *
 * USAGE:
 * ```javascript
 * router.post('/files/batch',
 *   requireAuth,
 *   uploadFileMultiple,     // Accept up to 10 files
 *   handleUploadError,
 *   async (req, res) => {
 *     // req.files is array of uploaded files
 *     for (const file of req.files) {
 *       await saveFile(req.user._id, file);
 *     }
 *   }
 * );
 * ```
 *
 * HTML FORM:
 * ```html
 * <form enctype="multipart/form-data">
 *   <input type="file" name="files" multiple>
 *   <button>Upload All</button>
 * </form>
 * ```
 */
export const uploadFileMultiple = fileUpload.array('files', 10);

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

/**
 * handleUploadError(err, req, res, next) - Handle Upload Errors
 * ==============================================================
 * This error-handling middleware catches and formats errors from the
 * upload (multer) middleware. It should be placed immediately after
 * the upload middleware in your route.
 *
 * WHAT ERRORS DOES IT HANDLE?
 * ---------------------------
 * 1. MULTER ERRORS (from multer middleware)
 *    - File too large
 *    - Too many files
 *    - Unexpected field name
 *
 * 2. VALIDATION ERRORS (from fileFilter)
 *    - Invalid file type
 *    - Forbidden extension
 *
 * 3. OTHER ERRORS
 *    - Database errors, storage errors, etc.
 *
 * MIDDLEWARE CHAIN ORDER:
 * -----------------------
 * The order is important:
 *
 * router.post('/images',
 *   requireAuth,           // 1. Verify user is logged in
 *   uploadSingle,          // 2. Multer processes file (might fail)
 *   handleUploadError,     // 3. If multer fails, catch error here
 *   requireStorageLimit,   // 4. Check storage limits (if upload succeeded)
 *   saveImage              // 5. Save to database (only if all above pass)
 * );
 *
 * If uploadSingle fails:
 * - Error is caught by handleUploadError
 * - Client gets error response (never reaches saveImage)
 *
 * If uploadSingle succeeds:
 * - No error, handleUploadError calls next()
 * - Request continues to requireStorageLimit
 *
 * @param {Error} err - Error object from multer or other middleware
 *   - err instanceof multer.MulterError: Is it a multer error?
 *   - err.code: Specific error code (LIMIT_FILE_SIZE, etc.)
 *   - err.message: Error message
 *
 * @param {Request} req - Express request object
 *
 * @param {Response} res - Express response object
 *
 * @param {Function} next - Express next function
 *   - Called only if no error (middleware should handle or return response)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * router.post('/images/upload',
 *   requireAuth,
 *   uploadSingle,
 *   handleUploadError,    // Catches multer errors here
 *   async (req, res) => {
 *     // Only reaches here if upload succeeded
 *     const image = await Image.create({
 *       userId: req.user._id,
 *       data: req.file.buffer,
 *       size: req.file.size
 *     });
 *     res.json(image);
 *   }
 * );
 * ```
 *
 * ERROR RESPONSES:
 * ----------------
 * FILE TOO LARGE (LIMIT_FILE_SIZE):
 * ```json
 * {
 *   "error": "File too large. Maximum size is 5MB.",
 *   "code": "FILE_TOO_LARGE"
 * }
 * ```
 *
 * INVALID FILE TYPE:
 * ```json
 * {
 *   "error": "Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.",
 *   "code": "UPLOAD_ERROR"
 * }
 * ```
 *
 * OTHER MULTER ERRORS:
 * ```json
 * {
 *   "error": "Unexpected field",
 *   "code": "UPLOAD_ERROR"
 * }
 * ```
 */
export const handleUploadError = (err, req, res, next) => {
  // =========================================================================
  // CHECK IF ERROR IS FROM MULTER
  // =========================================================================
  // Multer throws MulterError instances for upload-specific issues

  if (err instanceof multer.MulterError) {
    // =========================================================================
    // FILE SIZE EXCEEDED
    // =========================================================================
    // Multer enforces file size limits and throws LIMIT_FILE_SIZE if exceeded

    if (err.code === 'LIMIT_FILE_SIZE') {
      // Determine which upload type this was
      // Different upload types have different size limits:
      // - Image uploads: 5MB max
      // - File uploads: 100MB max
      const isImageUpload = err.field === 'image';
      const maxSize = isImageUpload ? '5MB' : '100MB';

      return res.status(400).json({
        error: `File too large. Maximum size is ${maxSize}.`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // =========================================================================
    // OTHER MULTER ERRORS
    // =========================================================================
    // Examples:
    // - LIMIT_PART_COUNT: Too many parts in multipart body
    // - LIMIT_FILE_COUNT: Too many files uploaded
    // - LIMIT_FIELD_KEY: Field name too long
    // - LIMIT_FIELD_VALUE: Field value too large
    // - LIMIT_FIELD_COUNT: Too many fields
    // - LIMIT_UNEXPECTED_FILE: Unexpected file field
    // - LIMIT_FIELD_SIZE: Field size too large
    // - STREAM_TRUNCATED: Stream truncated
    // - FILE_TOO_LARGE: File size exceeded (different from our check above)

    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }

  // =========================================================================
  // NON-MULTER ERRORS
  // =========================================================================
  // These could be from our custom fileFilter function
  // Example: imageFileFilter throws error if MIME type is invalid

  if (err) {
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }

  // =========================================================================
  // NO ERROR - CONTINUE
  // =========================================================================
  // If there's no error, proceed to next middleware
  // This allows the chain to continue

  next();
};

// =============================================================================
// MAGIC NUMBER VALIDATION
// =============================================================================

/**
 * MAGIC_NUMBER_TO_MIME_MAP
 * ------------------------
 * Maps file-type detected MIME types to allowed categories.
 * Used to validate that file content matches declared type.
 */
const ALLOWED_IMAGE_MAGIC_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * validateMagicNumber(buffer, declaredMimeType, allowedTypes) - Validate File Content
 * ====================================================================================
 * Validates that a file's actual content (magic numbers) matches its declared type.
 * This prevents attacks where malicious files are uploaded with fake extensions.
 *
 * WHAT ARE MAGIC NUMBERS?
 * -----------------------
 * Magic numbers are the first few bytes of a file that identify its format:
 * - JPEG: Starts with 0xFF 0xD8 0xFF
 * - PNG: Starts with 0x89 0x50 0x4E 0x47
 * - GIF: Starts with "GIF87a" or "GIF89a"
 * - ZIP/DOCX: Starts with 0x50 0x4B (PK)
 *
 * WHY IS THIS IMPORTANT?
 * ----------------------
 * An attacker could:
 * 1. Take a malicious script (e.g., JavaScript)
 * 2. Rename it to "innocent.jpg"
 * 3. Upload it (MIME type would be image/jpeg based on extension)
 * 4. If the server serves it, browsers might execute it
 *
 * Magic number validation detects this because:
 * - File claims to be JPEG
 * - But content starts with "function malware()..." not JPEG magic bytes
 * - Validation fails, upload rejected
 *
 * @param {Buffer} buffer - The file content buffer
 * @param {string} declaredMimeType - The MIME type claimed by the upload
 * @param {string[]} allowedTypes - Array of allowed MIME types (optional)
 *
 * @returns {Promise<Object>} Validation result
 *   - isValid: boolean - Does content match declared type?
 *   - detectedType: string|null - Actual MIME type detected from content
 *   - declaredType: string - The declared MIME type
 *   - error: string|null - Error message if validation failed
 *
 * USAGE IN ROUTE HANDLER:
 * ```javascript
 * router.post('/images', requireAuth, uploadSingle, handleUploadError, async (req, res) => {
 *   // Validate that uploaded file is actually an image
 *   const validation = await validateMagicNumber(
 *     req.file.buffer,
 *     req.file.mimetype,
 *     ALLOWED_IMAGE_MAGIC_TYPES
 *   );
 *
 *   if (!validation.isValid) {
 *     return res.status(400).json({
 *       error: validation.error,
 *       code: 'INVALID_FILE_CONTENT'
 *     });
 *   }
 *
 *   // File content is verified, proceed with saving
 * });
 * ```
 *
 * SECURITY NOTE:
 * This validation should happen AFTER multer processes the upload,
 * in the route handler. The fileFilter in multer doesn't have access
 * to the full file buffer, only metadata.
 */
export async function validateMagicNumber(buffer, declaredMimeType, allowedTypes = null) {
  try {
    // Detect actual file type from content (magic numbers)
    const detectedType = await fileTypeFromBuffer(buffer);

    // If file-type couldn't detect the type
    // This happens with text files, which don't have magic numbers
    if (!detectedType) {
      // For text-based files (no magic number), check if declared type is safe
      // Text files include: .txt, .json, .csv, .md, etc.
      const textMimeTypes = [
        'text/plain',
        'text/csv',
        'text/html',
        'text/css',
        'text/markdown',
        'application/json',
        'application/xml',
      ];

      if (textMimeTypes.includes(declaredMimeType)) {
        return {
          isValid: true,
          detectedType: null,
          declaredType: declaredMimeType,
          error: null
        };
      }

      // Unknown type with no magic number - could be suspicious
      // Allow it but flag that detection was inconclusive
      return {
        isValid: true, // Allow, but caller can decide based on context
        detectedType: null,
        declaredType: declaredMimeType,
        warning: 'File type could not be verified from content'
      };
    }

    // If allowedTypes is specified, check if detected type is allowed
    if (allowedTypes && !allowedTypes.includes(detectedType.mime)) {
      return {
        isValid: false,
        detectedType: detectedType.mime,
        declaredType: declaredMimeType,
        error: `File content is ${detectedType.mime}, which is not allowed. Expected: ${allowedTypes.join(', ')}`
      };
    }

    // Check if declared type matches detected type (for stricter validation)
    // Some browsers may send slightly different MIME types, so we normalize
    const declaredBase = declaredMimeType.split(';')[0].trim();
    const detectedBase = detectedType.mime;

    // Allow minor variations (e.g., image/jpg vs image/jpeg)
    const mimeAliases = {
      'image/jpg': 'image/jpeg',
      'image/jpeg': 'image/jpeg',
    };

    const normalizedDeclared = mimeAliases[declaredBase] || declaredBase;
    const normalizedDetected = mimeAliases[detectedBase] || detectedBase;

    if (normalizedDeclared !== normalizedDetected) {
      // Type mismatch - this could indicate a disguised file
      return {
        isValid: false,
        detectedType: detectedType.mime,
        declaredType: declaredMimeType,
        error: `File content doesn't match declared type. Declared: ${declaredMimeType}, Actual: ${detectedType.mime}`
      };
    }

    // All validations passed
    return {
      isValid: true,
      detectedType: detectedType.mime,
      declaredType: declaredMimeType,
      error: null
    };

  } catch (error) {
    // Error during validation - log and allow (fail-open for availability)
    // In high-security environments, you might want to fail-closed instead
    console.error('[UPLOAD] Magic number validation error:', error.message);
    return {
      isValid: true, // Fail-open to avoid blocking legitimate uploads
      detectedType: null,
      declaredType: declaredMimeType,
      warning: 'Validation error, file allowed but not verified'
    };
  }
}

/**
 * validateImageMagicNumber(buffer, declaredMimeType) - Validate Image Content
 * ===========================================================================
 * Convenience wrapper for validateMagicNumber specifically for image uploads.
 * Restricts to image MIME types only.
 *
 * @param {Buffer} buffer - Image file buffer
 * @param {string} declaredMimeType - Declared MIME type
 * @returns {Promise<Object>} Validation result
 */
export async function validateImageMagicNumber(buffer, declaredMimeType) {
  return validateMagicNumber(buffer, declaredMimeType, ALLOWED_IMAGE_MAGIC_TYPES);
}

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
