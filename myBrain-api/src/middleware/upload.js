import multer from 'multer';

// Allowed MIME types
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Memory storage for streaming to Cloudinary
const storage = multer.memoryStorage();

// File filter for image validation
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Middleware for single image upload
export const uploadSingle = upload.single('image');

// Error handling middleware for multer errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  if (err) {
    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  next();
};

export default upload;
