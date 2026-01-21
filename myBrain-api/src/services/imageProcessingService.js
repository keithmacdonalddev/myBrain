/**
 * =============================================================================
 * IMAGEPROCESSINGSERVICE.JS - Image Manipulation with Sharp Library
 * =============================================================================
 *
 * This service handles all image processing operations using the Sharp library.
 * It provides functions for resizing, cropping, format conversion, thumbnail
 * generation, and various image transformations.
 *
 * WHAT IS SHARP?
 * --------------
 * Sharp is a high-performance Node.js library for image processing. It uses
 * the libvips image processing library under the hood, which is much faster
 * than ImageMagick or GraphicsMagick.
 *
 * Key features of Sharp:
 * - Very fast (uses C++ under the hood)
 * - Low memory usage (streams images)
 * - Supports: JPEG, PNG, WebP, AVIF, GIF, SVG, TIFF
 * - Can resize, crop, rotate, blur, sharpen, and more
 *
 * WHY USE SHARP?
 * --------------
 * 1. PERFORMANCE: 10-20x faster than pure JavaScript solutions
 * 2. QUALITY: Better resizing algorithms (Lanczos, cubic, etc.)
 * 3. MEMORY: Doesn't load entire image into memory at once
 * 4. FEATURES: Full-featured image manipulation
 *
 * PROCESSING PIPELINE:
 * -------------------
 * When processing images, Sharp uses a "pipeline" approach:
 *
 * 1. Load image from buffer/file → 2. Apply operations → 3. Output to buffer/file
 *
 * Operations are chained and executed efficiently in order.
 *
 * IMAGE METADATA:
 * ---------------
 * Every digital image contains metadata:
 * - WIDTH/HEIGHT: Dimensions in pixels
 * - FORMAT: File format (jpeg, png, webp, etc.)
 * - COLOR SPACE: How colors are represented (sRGB, CMYK, etc.)
 * - CHANNELS: Number of color channels (3 for RGB, 4 for RGBA)
 * - ORIENTATION: EXIF rotation info from camera
 *
 * THUMBNAIL GENERATION:
 * --------------------
 * Thumbnails are small preview versions of images. They're important because:
 * - SPEED: Smaller files load faster in galleries
 * - BANDWIDTH: Less data transferred
 * - PERFORMANCE: Browser handles small images better
 *
 * Typical thumbnail: 300x300 pixels, JPEG format, 80% quality
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Sharp is our image processing library.
 * It provides all the image manipulation functionality we need.
 */
import sharp from 'sharp';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * DEFAULT_CONFIG
 * --------------
 * Default settings for image processing operations.
 * These can be overridden when calling processing functions.
 *
 * CONFIGURATION GROUPS:
 * 1. thumbnail: Settings for generating small preview images
 * 2. preview: Settings for medium-sized previews
 * 3. original: Settings for optimizing the original image
 */
const DEFAULT_CONFIG = {
  /**
   * Thumbnail configuration
   * -----------------------
   * Small square images for galleries and lists.
   *
   * @property {number} width - Target width in pixels (300px)
   * @property {number} height - Target height in pixels (300px)
   * @property {string} fit - How to fit image into dimensions
   *   - 'cover': Fill entire area, may crop edges
   *   - 'contain': Fit entirely within area, may have letterboxing
   *   - 'inside': Shrink to fit inside without enlarging
   * @property {string} position - Where to anchor when cropping
   *   - 'center', 'top', 'bottom', 'left', 'right', etc.
   * @property {number} quality - JPEG quality (0-100, higher = better but larger)
   * @property {string} format - Output format
   */
  thumbnail: {
    width: 300,
    height: 300,
    fit: 'cover',
    position: 'center',
    quality: 80,
    format: 'jpeg',
  },

  /**
   * Preview configuration
   * ---------------------
   * Medium-sized images for detailed views without full resolution.
   * Good for web display where full resolution isn't needed.
   *
   * @property {number} maxWidth - Maximum width (height auto-calculated)
   * @property {number} quality - JPEG quality (85% is good balance)
   * @property {string} format - Output format
   */
  preview: {
    maxWidth: 1200,
    quality: 85,
    format: 'jpeg',
  },

  /**
   * Original optimization configuration
   * -----------------------------------
   * Settings for optimizing the original uploaded image.
   * We limit maximum dimensions to prevent extremely large images.
   *
   * 4096x4096 is a reasonable max that's:
   * - Large enough for most uses
   * - Small enough to handle efficiently
   * - Compatible with most devices/browsers
   *
   * @property {number} maxWidth - Maximum width before resizing
   * @property {number} maxHeight - Maximum height before resizing
   * @property {number} quality - JPEG quality (90% maintains good detail)
   */
  original: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 90,
  },
};

// =============================================================================
// MAIN PROCESSING FUNCTIONS
// =============================================================================

/**
 * processImage(buffer, options)
 * -----------------------------
 * Main function to process an uploaded image.
 * Handles multiple operations in one pass: optimization, thumbnails, previews.
 *
 * @param {Buffer} buffer - The raw image data (binary)
 *   This comes from the uploaded file (req.file.buffer in Express)
 *
 * @param {Object} options - Processing options
 * @param {boolean} options.generateThumbnail - Create a thumbnail? (default: true)
 * @param {boolean} options.generatePreview - Create a preview? (default: false)
 * @param {boolean} options.optimizeOriginal - Resize large images? (default: true)
 * @param {Object} options.thumbnailConfig - Override thumbnail settings
 * @param {Object} options.previewConfig - Override preview settings
 * @param {Object} options.originalConfig - Override original settings
 *
 * @returns {Promise<Object>} Processing results:
 *   - original: Buffer - The (possibly resized) original image
 *   - thumbnail: Buffer|null - The thumbnail image
 *   - preview: Buffer|null - The preview image
 *   - metadata: Object - Image information (dimensions, colors, etc.)
 *
 * EXAMPLE:
 * ```javascript
 * const result = await processImage(uploadedFile.buffer, {
 *   generateThumbnail: true,
 *   generatePreview: false,
 *   optimizeOriginal: true
 * });
 *
 * // result.original - Store this in cloud storage
 * // result.thumbnail - Store separately for gallery views
 * // result.metadata.width - Image width
 * // result.metadata.dominantColor - Main color (e.g., "#4A90D9")
 * ```
 */
export async function processImage(buffer, options = {}) {
  // =====================================================
  // MERGE OPTIONS WITH DEFAULTS
  // =====================================================
  // Use provided options, fall back to defaults

  const {
    generateThumbnail = true,
    generatePreview = false,
    optimizeOriginal = true,
    thumbnailConfig = {},
    previewConfig = {},
    originalConfig = {},
  } = options;

  // Merge configs: default settings + user overrides
  const thumbConfig = { ...DEFAULT_CONFIG.thumbnail, ...thumbnailConfig };
  const prevConfig = { ...DEFAULT_CONFIG.preview, ...previewConfig };
  const origConfig = { ...DEFAULT_CONFIG.original, ...originalConfig };

  // =====================================================
  // EXTRACT METADATA
  // =====================================================
  // Get image info before processing

  const metadata = await extractMetadata(buffer);

  // Initialize results object
  const results = {
    original: buffer,    // Start with unmodified buffer
    thumbnail: null,     // Will hold thumbnail if generated
    preview: null,       // Will hold preview if generated
    metadata,            // Image information
  };

  // =====================================================
  // OPTIMIZE ORIGINAL
  // =====================================================
  // Resize if image exceeds maximum dimensions

  if (optimizeOriginal && (metadata.width > origConfig.maxWidth || metadata.height > origConfig.maxHeight)) {
    // Image is too large - resize it

    results.original = await sharp(buffer)
      // Resize to fit within max dimensions
      .resize(origConfig.maxWidth, origConfig.maxHeight, {
        fit: 'inside',              // Fit inside box (don't crop)
        withoutEnlargement: true,   // Never make image larger
      })
      // Convert to optimized JPEG
      // mozjpeg: true uses Mozilla's JPEG encoder for better compression
      .jpeg({ quality: origConfig.quality, mozjpeg: true })
      // Output as buffer (binary data)
      .toBuffer();

    // Update metadata to reflect new dimensions
    const newMeta = await sharp(results.original).metadata();
    results.metadata.width = newMeta.width;
    results.metadata.height = newMeta.height;
    results.metadata.wasResized = true;  // Flag that we resized
  }

  // =====================================================
  // GENERATE THUMBNAIL
  // =====================================================
  // Create small preview for galleries

  if (generateThumbnail) {
    results.thumbnail = await sharp(buffer)
      // Resize to thumbnail dimensions
      .resize(thumbConfig.width, thumbConfig.height, {
        fit: thumbConfig.fit,           // 'cover' fills area completely
        position: thumbConfig.position, // 'center' keeps faces/subjects
      })
      // Convert to JPEG (universally supported, small file size)
      .jpeg({ quality: thumbConfig.quality })
      .toBuffer();
  }

  // =====================================================
  // GENERATE PREVIEW
  // =====================================================
  // Create medium-sized version for web viewing

  if (generatePreview) {
    results.preview = await sharp(buffer)
      // Resize width, maintain aspect ratio (height = null)
      .resize(prevConfig.maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: prevConfig.quality })
      .toBuffer();
  }

  return results;
}

// =============================================================================
// METADATA EXTRACTION
// =============================================================================

/**
 * extractMetadata(buffer)
 * -----------------------
 * Extract detailed information about an image.
 * Useful for:
 * - Storing image dimensions in database
 * - Creating responsive image layouts
 * - Extracting color palettes for UI themes
 * - Detecting animated GIFs
 *
 * @param {Buffer} buffer - Raw image data
 *
 * @returns {Promise<Object>} Image metadata:
 *   - width: Image width in pixels
 *   - height: Image height in pixels
 *   - format: File format (jpeg, png, webp, etc.)
 *   - space: Color space (srgb, cmyk, etc.)
 *   - channels: Number of color channels (3=RGB, 4=RGBA)
 *   - depth: Bit depth (8, 16, etc.)
 *   - density: DPI (dots per inch)
 *   - hasAlpha: Does image have transparency?
 *   - orientation: EXIF orientation (1-8)
 *   - aspectRatio: Width/height ratio (e.g., 1.78 for 16:9)
 *   - dominantColor: Main color as hex (e.g., "#4A90D9")
 *   - colors: Array of prominent colors
 *   - isAnimated: Is this an animated GIF?
 *   - pages: Number of frames (for animated images)
 *
 * EXAMPLE:
 * ```javascript
 * const meta = await extractMetadata(imageBuffer);
 * console.log(`Image is ${meta.width}x${meta.height}`);
 * console.log(`Main color: ${meta.dominantColor}`);
 * ```
 */
export async function extractMetadata(buffer) {
  // Create Sharp instance for this image
  const image = sharp(buffer);

  // Get basic metadata (dimensions, format, etc.)
  const metadata = await image.metadata();

  // Get statistics (color info, channel averages)
  const stats = await image.stats();

  // =====================================================
  // CALCULATE ASPECT RATIO
  // =====================================================
  // Aspect ratio helps with responsive layouts
  // 1.0 = square, 1.78 = 16:9, 1.33 = 4:3

  const aspectRatio = metadata.width && metadata.height
    ? parseFloat((metadata.width / metadata.height).toFixed(4))
    : null;

  // =====================================================
  // EXTRACT COLORS
  // =====================================================
  // Dominant color is useful for placeholders and UI theming

  const dominantColor = rgbToHex(stats.dominant);
  const colors = extractColors(stats);

  // =====================================================
  // RETURN COMPREHENSIVE METADATA
  // =====================================================

  return {
    width: metadata.width,              // Pixel width
    height: metadata.height,            // Pixel height
    format: metadata.format,            // jpeg, png, webp, etc.
    space: metadata.space,              // Color space (srgb, cmyk)
    channels: metadata.channels,        // 3 (RGB) or 4 (RGBA)
    depth: metadata.depth,              // Bit depth (usually 8)
    density: metadata.density,          // DPI if available
    hasAlpha: metadata.hasAlpha,        // Has transparency?
    orientation: metadata.orientation,  // EXIF rotation
    aspectRatio,                        // Width/height ratio
    dominantColor,                      // Main color hex
    colors,                             // Color palette array
    isAnimated: metadata.pages > 1,     // Multiple frames = animation
    pages: metadata.pages || 1,         // Frame count
  };
}

// =============================================================================
// THUMBNAIL GENERATION
// =============================================================================

/**
 * generateThumbnail(buffer, options)
 * ----------------------------------
 * Create a thumbnail from an image.
 * Standalone function for when you only need a thumbnail.
 *
 * @param {Buffer} buffer - Source image data
 * @param {Object} options - Thumbnail settings
 * @param {number} options.width - Thumbnail width (default: 300)
 * @param {number} options.height - Thumbnail height (default: 300)
 * @param {string} options.fit - Fit mode ('cover', 'contain', 'inside')
 * @param {string} options.position - Crop anchor ('center', 'top', etc.)
 * @param {number} options.quality - JPEG quality (0-100)
 *
 * @returns {Promise<Buffer>} Thumbnail image data
 *
 * EXAMPLE:
 * ```javascript
 * const thumbnail = await generateThumbnail(imageBuffer, {
 *   width: 200,
 *   height: 200,
 *   quality: 85
 * });
 * ```
 */
export async function generateThumbnail(buffer, options = {}) {
  // Merge user options with defaults
  const config = { ...DEFAULT_CONFIG.thumbnail, ...options };

  return sharp(buffer)
    .resize(config.width, config.height, {
      fit: config.fit,
      position: config.position,
    })
    .jpeg({ quality: config.quality })
    .toBuffer();
}

// =============================================================================
// RESIZE FUNCTION
// =============================================================================

/**
 * resizeImage(buffer, width, height, options)
 * -------------------------------------------
 * Resize an image to specific dimensions.
 *
 * @param {Buffer} buffer - Source image data
 * @param {number} width - Target width in pixels
 * @param {number} height - Target height (null = maintain aspect ratio)
 * @param {Object} options - Resize options
 * @param {string} options.fit - How to fit:
 *   - 'cover': Fill area, crop excess
 *   - 'contain': Fit inside, may letterbox
 *   - 'fill': Stretch to fill (distorts)
 *   - 'inside': Shrink to fit inside
 *   - 'outside': Expand to cover outside
 * @param {string} options.position - Crop anchor when fit='cover'
 * @param {boolean} options.withoutEnlargement - Don't make smaller images larger
 * @param {string} options.format - Output format (jpeg, png, webp, avif)
 * @param {number} options.quality - Output quality (0-100)
 *
 * @returns {Promise<Buffer>} Resized image data
 *
 * EXAMPLE:
 * ```javascript
 * // Resize to 800px wide, maintain aspect ratio
 * const resized = await resizeImage(buffer, 800, null);
 *
 * // Resize to exact dimensions, use WebP format
 * const thumb = await resizeImage(buffer, 200, 200, {
 *   fit: 'cover',
 *   format: 'webp',
 *   quality: 90
 * });
 * ```
 */
export async function resizeImage(buffer, width, height = null, options = {}) {
  const {
    fit = 'inside',
    position = 'center',
    withoutEnlargement = true,
    format = 'jpeg',
    quality = 85,
  } = options;

  // Start the processing pipeline
  let pipeline = sharp(buffer)
    .resize(width, height, {
      fit,
      position,
      withoutEnlargement,
    });

  // =====================================================
  // APPLY OUTPUT FORMAT
  // =====================================================
  // Different formats have different strengths:
  // - JPEG: Photos, no transparency, smallest for photos
  // - PNG: Screenshots, transparency, lossless option
  // - WebP: Modern format, best compression, transparency
  // - AVIF: Newest format, even better compression

  switch (format.toLowerCase()) {
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    default:
      // JPEG is the default - mozjpeg for better compression
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.toBuffer();
}

// =============================================================================
// FORMAT CONVERSION
// =============================================================================

/**
 * convertFormat(buffer, format, options)
 * --------------------------------------
 * Convert an image to a different format.
 *
 * @param {Buffer} buffer - Source image data
 * @param {string} format - Target format:
 *   - 'jpeg' or 'jpg': JPEG format
 *   - 'png': PNG format
 *   - 'webp': WebP format (modern, excellent compression)
 *   - 'avif': AVIF format (newest, best compression)
 *   - 'gif': GIF format (for animations)
 * @param {Object} options - Conversion options
 * @param {number} options.quality - Output quality (0-100)
 *
 * @returns {Promise<Buffer>} Converted image data
 *
 * EXAMPLE:
 * ```javascript
 * // Convert JPEG to WebP for smaller file size
 * const webp = await convertFormat(jpegBuffer, 'webp', { quality: 85 });
 *
 * // Convert to PNG for lossless quality
 * const png = await convertFormat(imageBuffer, 'png');
 * ```
 *
 * FORMAT COMPARISON:
 * - JPEG: Best for photos, no transparency, 100KB typical
 * - PNG: Best for screenshots/graphics, transparency, 300KB typical
 * - WebP: 25-35% smaller than JPEG, transparency, 70KB typical
 * - AVIF: 50% smaller than JPEG, newest browsers only
 */
export async function convertFormat(buffer, format, options = {}) {
  const { quality = 85 } = options;
  let pipeline = sharp(buffer);

  switch (format.toLowerCase()) {
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'gif':
      // GIF doesn't have quality setting
      pipeline = pipeline.gif();
      break;
    default:
      // Default to JPEG with mozjpeg optimization
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.toBuffer();
}

// =============================================================================
// IMAGE TRANSFORMATIONS
// =============================================================================

/**
 * applyTransforms(buffer, transforms)
 * -----------------------------------
 * Apply various transformations to an image.
 * Useful for image editing features.
 *
 * @param {Buffer} buffer - Source image data
 * @param {Object} transforms - Transformations to apply:
 *   @param {number} transforms.rotate - Rotation in degrees (0-360)
 *   @param {boolean} transforms.flip - Flip vertically (upside down)
 *   @param {boolean} transforms.flop - Flip horizontally (mirror)
 *   @param {boolean|Object} transforms.sharpen - Sharpen image
 *   @param {number} transforms.blur - Blur radius (0.3-1000)
 *   @param {boolean} transforms.grayscale - Convert to black & white
 *   @param {boolean} transforms.negate - Invert colors (negative)
 *   @param {boolean} transforms.normalize - Enhance contrast
 *   @param {number} transforms.gamma - Gamma correction (0.1-3)
 *   @param {number} transforms.brightness - Brightness multiplier (0.5-2)
 *   @param {number} transforms.saturation - Color saturation (0=gray, 1=normal, 2=vivid)
 *
 * @returns {Promise<Buffer>} Transformed image data
 *
 * EXAMPLE:
 * ```javascript
 * // Rotate and sharpen a photo
 * const edited = await applyTransforms(buffer, {
 *   rotate: 90,
 *   sharpen: true
 * });
 *
 * // Create a vintage effect
 * const vintage = await applyTransforms(buffer, {
 *   saturation: 0.7,
 *   brightness: 1.1,
 *   blur: 0.5
 * });
 * ```
 *
 * TRANSFORMATION EXPLANATIONS:
 * - rotate: Rotates image clockwise
 * - flip: Vertical mirror (top becomes bottom)
 * - flop: Horizontal mirror (left becomes right)
 * - sharpen: Enhances edges, makes details crisper
 * - blur: Softens image, removes detail
 * - grayscale: Removes all color information
 * - negate: Inverts colors (like a photo negative)
 * - normalize: Stretches contrast to use full range
 * - gamma: Adjusts midtone brightness (>1 = brighter)
 * - brightness: Overall lightness/darkness
 * - saturation: Color intensity (0 = no color)
 */
export async function applyTransforms(buffer, transforms = {}) {
  const {
    rotate,
    flip,
    flop,
    sharpen,
    blur,
    grayscale,
    negate,
    normalize,
    gamma,
    brightness,
    saturation,
  } = transforms;

  let pipeline = sharp(buffer);

  // =====================================================
  // GEOMETRIC TRANSFORMS
  // =====================================================

  if (rotate) {
    // Rotate image by specified degrees
    // Sharp handles transparent areas from rotation
    pipeline = pipeline.rotate(rotate);
  }

  if (flip) {
    // Flip vertically (upside down)
    pipeline = pipeline.flip();
  }

  if (flop) {
    // Flip horizontally (mirror)
    pipeline = pipeline.flop();
  }

  // =====================================================
  // SHARPENING AND BLURRING
  // =====================================================

  if (sharpen) {
    // Sharpen can be boolean or detailed config object
    pipeline = pipeline.sharpen(
      typeof sharpen === 'object' ? sharpen : undefined
    );
  }

  if (blur && blur > 0) {
    // Blur must be > 0.3 for visible effect
    pipeline = pipeline.blur(blur);
  }

  // =====================================================
  // COLOR TRANSFORMS
  // =====================================================

  if (grayscale) {
    // Convert to black and white
    pipeline = pipeline.grayscale();
  }

  if (negate) {
    // Invert all colors (photo negative effect)
    pipeline = pipeline.negate();
  }

  if (normalize) {
    // Enhance contrast by stretching pixel values
    pipeline = pipeline.normalize();
  }

  if (gamma) {
    // Adjust gamma (affects midtones)
    pipeline = pipeline.gamma(gamma);
  }

  // =====================================================
  // BRIGHTNESS AND SATURATION
  // =====================================================

  if (brightness !== undefined || saturation !== undefined) {
    // modulate() adjusts brightness, saturation, and hue
    pipeline = pipeline.modulate({
      brightness: brightness || 1,   // 1 = no change
      saturation: saturation || 1,   // 1 = no change
    });
  }

  return pipeline.toBuffer();
}

// =============================================================================
// CROPPING
// =============================================================================

/**
 * cropImage(buffer, cropOptions)
 * ------------------------------
 * Extract a rectangular region from an image.
 *
 * @param {Buffer} buffer - Source image data
 * @param {Object} cropOptions - Crop region:
 *   @param {number} cropOptions.left - X coordinate of top-left corner (default: 0)
 *   @param {number} cropOptions.top - Y coordinate of top-left corner (default: 0)
 *   @param {number} cropOptions.width - Width of region to extract
 *   @param {number} cropOptions.height - Height of region to extract
 *
 * @returns {Promise<Buffer>} Cropped image data
 *
 * COORDINATE SYSTEM:
 * (0,0) is top-left corner
 * X increases going right
 * Y increases going down
 *
 * Example: Crop a 100x100 region from center of 400x400 image:
 * cropImage(buffer, { left: 150, top: 150, width: 100, height: 100 })
 *
 * EXAMPLE:
 * ```javascript
 * // Crop top-left quadrant
 * const cropped = await cropImage(buffer, {
 *   left: 0,
 *   top: 0,
 *   width: imageWidth / 2,
 *   height: imageHeight / 2
 * });
 * ```
 */
export async function cropImage(buffer, cropOptions) {
  const { left = 0, top = 0, width, height } = cropOptions;

  return sharp(buffer)
    // extract() crops to specified region
    .extract({ left, top, width, height })
    .toBuffer();
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * isValidImage(buffer)
 * --------------------
 * Check if a buffer contains a valid image.
 * Use this before processing to avoid errors with invalid files.
 *
 * @param {Buffer} buffer - Data to check
 * @returns {Promise<boolean>} True if valid image, false otherwise
 *
 * EXAMPLE:
 * ```javascript
 * if (await isValidImage(uploadedFile.buffer)) {
 *   // Safe to process
 *   const thumbnail = await generateThumbnail(uploadedFile.buffer);
 * } else {
 *   throw new Error('Invalid image file');
 * }
 * ```
 */
export async function isValidImage(buffer) {
  try {
    // If we can read metadata, it's a valid image
    await sharp(buffer).metadata();
    return true;
  } catch {
    // Sharp threw an error - not a valid image
    return false;
  }
}

/**
 * getSupportedFormats()
 * ---------------------
 * Get list of image formats Sharp can read/write.
 * Useful for validating upload types.
 *
 * @returns {Promise<Object>} Format support information
 *
 * EXAMPLE:
 * ```javascript
 * const formats = await getSupportedFormats();
 * // formats.jpeg = { input: { file: true, buffer: true }, output: { ... } }
 * ```
 */
export async function getSupportedFormats() {
  return sharp.format;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * rgbToHex(rgb)
 * -------------
 * Convert RGB color object to hexadecimal color string.
 *
 * @param {Object} rgb - RGB color object
 * @param {number} rgb.r - Red component (0-255)
 * @param {number} rgb.g - Green component (0-255)
 * @param {number} rgb.b - Blue component (0-255)
 *
 * @returns {string} Hex color string (e.g., "#4A90D9")
 *
 * HOW HEX COLORS WORK:
 * - Hex colors use base-16 (0-9, A-F) to represent RGB
 * - #RRGGBB where each pair is 00-FF (0-255 in decimal)
 * - #FF0000 = pure red, #00FF00 = pure green, #0000FF = pure blue
 * - #FFFFFF = white, #000000 = black
 *
 * EXAMPLE:
 * rgbToHex({ r: 74, g: 144, b: 217 }) → "#4A90D9"
 */
function rgbToHex({ r, g, b }) {
  /**
   * toHex(c) - Convert single 0-255 value to 2-digit hex
   * 15 → "0f" (needs leading zero)
   * 255 → "ff"
   */
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    // Ensure 2 digits (e.g., "5" becomes "05")
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * extractColors(stats)
 * --------------------
 * Extract a color palette from Sharp image statistics.
 * Returns the dominant color plus variations based on channel data.
 *
 * @param {Object} stats - Sharp stats object from image.stats()
 *
 * @returns {string[]} Array of hex color strings (max 5)
 *
 * COLOR EXTRACTION:
 * Sharp provides:
 * - stats.dominant: The most common color
 * - stats.channels: Per-channel statistics (R, G, B means)
 *
 * We use channel means to create a simple palette.
 * For more sophisticated palettes, dedicated libraries exist.
 */
function extractColors(stats) {
  const colors = [];

  // Add dominant color first (main color of image)
  if (stats.dominant) {
    colors.push(rgbToHex(stats.dominant));
  }

  // Create variations based on channel statistics
  // This gives us some color diversity from the image
  if (stats.channels) {
    stats.channels.forEach((channel, index) => {
      // Only process RGB channels (skip alpha if present)
      if (index < 3) {
        // Create a color emphasizing this channel
        const colorValues = [0, 0, 0];
        colorValues[index] = Math.round(channel.mean);

        // Only add if we haven't hit limit
        if (colors.length < 5) {
          const hex = rgbToHex({
            r: colorValues[0] || stats.channels[0]?.mean || 128,
            g: colorValues[1] || stats.channels[1]?.mean || 128,
            b: colorValues[2] || stats.channels[2]?.mean || 128,
          });

          // Avoid duplicates
          if (!colors.includes(hex)) {
            colors.push(hex);
          }
        }
      }
    });
  }

  // Return max 5 colors
  return colors.slice(0, 5);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all functions as named exports AND as default object.
 *
 * USAGE:
 *
 * // Named imports (preferred)
 * import { processImage, generateThumbnail } from './imageProcessingService.js';
 *
 * // Default import
 * import imageProcessing from './imageProcessingService.js';
 * await imageProcessing.processImage(buffer);
 *
 * FUNCTION SUMMARY:
 * - processImage: Main processing (thumbnail + preview + optimize)
 * - extractMetadata: Get image information
 * - generateThumbnail: Create small preview
 * - resizeImage: Resize to specific dimensions
 * - convertFormat: Change image format
 * - applyTransforms: Apply effects (rotate, blur, etc.)
 * - cropImage: Extract region from image
 * - isValidImage: Check if buffer is valid image
 * - getSupportedFormats: List supported formats
 */
export default {
  processImage,
  extractMetadata,
  generateThumbnail,
  resizeImage,
  convertFormat,
  applyTransforms,
  cropImage,
  isValidImage,
  getSupportedFormats,
};
