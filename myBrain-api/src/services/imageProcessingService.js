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
 * Create a thumbnail image from source image data.
 * Standalone function for when you only need a thumbnail (not full processImage).
 *
 * BUSINESS LOGIC:
 * - Resizes image to square thumbnail (default 300x300)
 * - Uses 'cover' fit by default (fills entire area, crops excess)
 * - Centers crop to keep subject in frame
 * - Converts to JPEG for universal compatibility and small file size
 * - Merges user options with defaults for flexible customization
 * - Returns binary buffer ready for upload to S3
 *
 * @param {Buffer} buffer - Source image data (binary)
 * @param {Object} options - Thumbnail configuration (all optional):
 *   - {number} options.width - Target width in pixels (default: 300)
 *   - {number} options.height - Target height in pixels (default: 300)
 *   - {string} options.fit - Resize fit mode (default: 'cover'):
 *     - 'cover': Fill area, crop excess (default for square thumbnails)
 *     - 'contain': Fit entirely within area, may letterbox
 *     - 'inside': Shrink to fit inside without enlarging
 *   - {string} options.position - Crop anchor (default: 'center'):
 *     - 'center', 'top', 'bottom', 'left', 'right', etc.
 *   - {number} options.quality - JPEG quality 0-100 (default: 80)
 *
 * @returns {Promise<Buffer>} Thumbnail image binary data ready for storage
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Create standard 300x300 thumbnail
 * const thumb = await generateThumbnail(imageBuffer);
 *
 * // Custom dimensions and quality
 * const squareThumbnail = await generateThumbnail(imageBuffer, {
 *   width: 200,
 *   height: 200,
 *   quality: 85
 * });
 *
 * // Create rectangular preview (not square)
 * const wideThumb = await generateThumbnail(imageBuffer, {
 *   width: 400,
 *   height: 200,
 *   fit: 'inside'  // Don't crop
 * });
 * ```
 */
export async function generateThumbnail(buffer, options = {}) {
  // =====================================================
  // MERGE OPTIONS WITH DEFAULTS
  // =====================================================
  // User options override defaults for flexibility

  const config = { ...DEFAULT_CONFIG.thumbnail, ...options };

  // =====================================================
  // GENERATE THUMBNAIL
  // =====================================================
  // Use Sharp pipeline: load → resize → convert to JPEG → output buffer

  return sharp(buffer)
    // Resize to target dimensions
    .resize(config.width, config.height, {
      fit: config.fit,  // How to fit (cover/contain/inside)
      position: config.position,  // Where to anchor crop (center/top/bottom/etc)
    })
    // Convert to JPEG (universal format, small file size)
    .jpeg({ quality: config.quality })
    // Output as binary buffer
    .toBuffer();
}

// =============================================================================
// RESIZE FUNCTION
// =============================================================================

/**
 * resizeImage(buffer, width, height, options)
 * -------------------------------------------
 * Resize an image to specific dimensions with flexible options.
 * Supports multiple output formats and resizing strategies.
 *
 * BUSINESS LOGIC:
 * - Resizes image to target dimensions
 * - Supports aspect ratio preservation (height = null)
 * - Supports multiple fitting strategies (cover, contain, etc.)
 * - Prevents enlargement of smaller images by default
 * - Supports multiple output formats with quality control
 * - Returns binary buffer ready for storage
 *
 * FIT MODES EXPLAINED:
 * - 'cover': Fill entire area, crop excess (loses edges)
 * - 'contain': Fit entirely within area, may add padding
 * - 'fill': Stretch to fill (may distort)
 * - 'inside': Shrink to fit inside (never enlarges)
 * - 'outside': Expand to cover outside (opposite of inside)
 *
 * FORMAT TRADEOFFS:
 * - JPEG: Best for photos, no transparency, 100KB typical
 * - PNG: Best for screenshots, supports transparency, 300KB typical
 * - WebP: Modern format, 25-35% smaller than JPEG, transparency
 * - AVIF: Newest format, 50% smaller than JPEG (limited browser support)
 *
 * @param {Buffer} buffer - Source image data (binary)
 * @param {number} width - Target width in pixels (required)
 * @param {number|null} height - Target height in pixels (null = maintain aspect ratio)
 * @param {Object} options - Resize configuration (all optional):
 *   - {string} options.fit - Resize fit strategy (default: 'inside')
 *   - {string} options.position - Crop anchor ('center', 'top', 'bottom', etc.)
 *   - {boolean} options.withoutEnlargement - Never make smaller images larger (default: true)
 *   - {string} options.format - Output format (default: 'jpeg'):
 *     - 'jpeg': JPEG format
 *     - 'png': PNG format
 *     - 'webp': WebP format
 *     - 'avif': AVIF format
 *   - {number} options.quality - Output quality 0-100 (default: 85)
 *
 * @returns {Promise<Buffer>} Resized image binary data
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Resize to 800px wide, maintain aspect ratio
 * const resized = await resizeImage(buffer, 800, null);
 *
 * // Resize to exact square, use WebP format
 * const square = await resizeImage(buffer, 200, 200, {
 *   fit: 'cover',
 *   format: 'webp',
 *   quality: 90
 * });
 *
 * // Create preview with black letterboxing
 * const preview = await resizeImage(buffer, 400, 300, {
 *   fit: 'contain',
 *   position: 'center',
 *   format: 'jpeg',
 *   quality: 85
 * });
 * ```
 */
export async function resizeImage(buffer, width, height = null, options = {}) {
  // =====================================================
  // EXTRACT AND MERGE OPTIONS
  // =====================================================

  const {
    fit = 'inside',  // Default fit mode (doesn't crop)
    position = 'center',  // Default crop position
    withoutEnlargement = true,  // Default: don't enlarge small images
    format = 'jpeg',  // Default: JPEG output
    quality = 85,  // Default: good quality balance
  } = options;

  // =====================================================
  // BUILD PROCESSING PIPELINE
  // =====================================================
  // Sharp uses pipeline pattern - operations are chained

  let pipeline = sharp(buffer)
    .resize(width, height, {
      fit,  // How to fit image into dimensions
      position,  // Where to anchor if cropping
      withoutEnlargement,  // Policy for small images
    });

  // =====================================================
  // APPLY OUTPUT FORMAT AND QUALITY
  // =====================================================
  // Different formats use different codecs and options

  switch (format.toLowerCase()) {
    case 'png':
      // PNG: Lossless, supports transparency
      pipeline = pipeline.png({ quality });
      break;

    case 'webp':
      // WebP: Modern format, excellent compression
      pipeline = pipeline.webp({ quality });
      break;

    case 'avif':
      // AVIF: Newest format, even better compression
      pipeline = pipeline.avif({ quality });
      break;

    default:
      // JPEG: Default, best for photos
      // mozjpeg: true = use Mozilla's improved JPEG encoder
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  // =====================================================
  // OUTPUT AS BUFFER
  // =====================================================
  // Convert pipeline result to binary buffer

  return pipeline.toBuffer();
}

// =============================================================================
// FORMAT CONVERSION
// =============================================================================

/**
 * convertFormat(buffer, format, options)
 * --------------------------------------
 * Convert an image from one format to another.
 * Useful for format conversion, optimization, or compatibility.
 *
 * BUSINESS LOGIC:
 * - Takes image in any supported format (detected automatically)
 * - Converts to target format with quality options
 * - Quality parameter varies by format (ignored for GIF)
 * - Returns binary buffer ready for storage
 * - Useful for: format conversion, file size optimization, compatibility
 *
 * FORMAT COMPARISON:
 * - JPEG: Best for photos, 100KB typical, no transparency
 *   - Use when: Photographs, web images, file size matters
 * - PNG: Lossless, 300KB typical, supports transparency
 *   - Use when: Screenshots, graphics, transparency needed
 * - WebP: Modern, 70KB typical, 25-35% smaller than JPEG
 *   - Use when: Modern browsers, file size critical, transparency okay
 * - AVIF: Newest, 50% smaller than JPEG, limited browser support
 *   - Use when: Future-proof, browsers fully support (use fallback)
 * - GIF: Animated or legacy, large file size
 *   - Use when: Animated images, legacy compatibility needed
 *
 * @param {Buffer} buffer - Source image data (binary)
 * @param {string} format - Target format (case-insensitive):
 *   - 'jpeg' or 'jpg': JPEG format (default if unrecognized)
 *   - 'png': PNG format (lossless)
 *   - 'webp': WebP format (modern, efficient)
 *   - 'avif': AVIF format (newest, best compression)
 *   - 'gif': GIF format (animated)
 * @param {Object} options - Conversion options:
 *   - {number} options.quality - Output quality 0-100 (default: 85)
 *     - Higher = better quality but larger file
 *     - GIF format ignores this option
 *
 * @returns {Promise<Buffer>} Converted image binary data
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Convert JPEG to WebP for smaller file size
 * const webp = await convertFormat(jpegBuffer, 'webp', { quality: 85 });
 *
 * // Convert PNG to JPEG to reduce file size
 * const jpeg = await convertFormat(pngBuffer, 'jpeg', { quality: 90 });
 *
 * // Convert to AVIF with high quality
 * const avif = await convertFormat(imageBuffer, 'avif', { quality: 95 });
 *
 * // Convert to PNG for lossless conversion
 * const png = await convertFormat(imageBuffer, 'png');
 * ```
 */
export async function convertFormat(buffer, format, options = {}) {
  // =====================================================
  // EXTRACT QUALITY OPTION
  // =====================================================

  const { quality = 85 } = options;  // Default: 85 quality

  // =====================================================
  // BUILD PROCESSING PIPELINE
  // =====================================================
  // Start with Sharp instance for this image

  let pipeline = sharp(buffer);

  // =====================================================
  // APPLY FORMAT CONVERSION
  // =====================================================
  // Each format has different encoding options

  switch (format.toLowerCase()) {
    case 'png':
      // PNG: Lossless, supports transparency
      pipeline = pipeline.png({ quality });
      break;

    case 'webp':
      // WebP: Modern format, excellent compression, transparency
      pipeline = pipeline.webp({ quality });
      break;

    case 'avif':
      // AVIF: Newest format, best compression
      pipeline = pipeline.avif({ quality });
      break;

    case 'gif':
      // GIF: Animated or legacy format (no quality setting)
      // Quality parameter is ignored for GIF
      pipeline = pipeline.gif();
      break;

    default:
      // Default to JPEG
      // mozjpeg: true = use Mozilla's improved JPEG encoder for better compression
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  // =====================================================
  // OUTPUT AS BUFFER
  // =====================================================
  // Convert pipeline result to binary buffer

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
 * Useful for cropping, framing, or creating new images from parts of original.
 *
 * BUSINESS LOGIC:
 * - Extracts rectangular region defined by coordinates
 * - Uses top-left corner coordinates (standard image coordinates)
 * - All parameters in pixels
 * - Returns cropped image as binary buffer
 * - Validates input implicitly (Sharp will error on invalid coords)
 *
 * COORDINATE SYSTEM:
 * ```
 * (0,0) ─────────────────────── (width, 0)
 *  │
 *  │
 *  │
 *  │
 *  │
 *  └─────────────────────── (width, height)
 *
 * (0,0) = top-left corner
 * X increases going right
 * Y increases going down
 * ```
 *
 * @param {Buffer} buffer - Source image data (binary)
 * @param {Object} cropOptions - Crop region definition (all in pixels):
 *   - {number} cropOptions.left - X coordinate of top-left corner (default: 0)
 *   - {number} cropOptions.top - Y coordinate of top-left corner (default: 0)
 *   - {number} cropOptions.width - Width of region to extract (required)
 *   - {number} cropOptions.height - Height of region to extract (required)
 *
 * @returns {Promise<Buffer>} Cropped image binary data
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Crop top-left quadrant of image
 * const cropped = await cropImage(buffer, {
 *   left: 0,
 *   top: 0,
 *   width: 300,
 *   height: 300
 * });
 *
 * // Crop center region from 400x400 image
 * const center = await cropImage(buffer, {
 *   left: 150,
 *   top: 150,
 *   width: 100,
 *   height: 100
 * });
 *
 * // Create custom aspect ratio (crop to 16:9 from center)
 * const widescreen = await cropImage(buffer, {
 *   left: 0,
 *   top: (imageHeight - (imageWidth * 9 / 16)) / 2,
 *   width: imageWidth,
 *   height: imageWidth * 9 / 16
 * });
 * ```
 */
export async function cropImage(buffer, cropOptions) {
  // =====================================================
  // EXTRACT CROP PARAMETERS
  // =====================================================

  const { left = 0, top = 0, width, height } = cropOptions;

  // =====================================================
  // CROP AND OUTPUT
  // =====================================================
  // extract() method crops to the specified rectangular region

  return sharp(buffer)
    // Extract rectangular region
    .extract({ left, top, width, height })
    // Output as binary buffer
    .toBuffer();
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * isValidImage(buffer)
 * --------------------
 * Validate that a buffer contains a valid, readable image.
 * Use this before processing to avoid errors with corrupted or invalid files.
 *
 * BUSINESS LOGIC:
 * - Attempts to read image metadata using Sharp
 * - If Sharp can read it, the buffer is a valid image
 * - If Sharp throws error, buffer is invalid or corrupted
 * - Returns boolean (never throws)
 * - Safe for validation in upload handlers
 *
 * @param {Buffer} buffer - Raw data to validate
 *
 * @returns {Promise<boolean>} True if valid image, false if invalid or corrupted
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In an upload handler
 * if (await isValidImage(req.file.buffer)) {
 *   // Safe to process
 *   const thumbnail = await generateThumbnail(req.file.buffer);
 * } else {
 *   throw new Error('Invalid image file - corrupted or not an image');
 * }
 *
 * // Check before expensive processing
 * const isImage = await isValidImage(uploadedBuffer);
 * if (!isImage) {
 *   return res.status(400).json({ error: 'File is not a valid image' });
 * }
 * ```
 */
export async function isValidImage(buffer) {
  try {
    // =====================================================
    // ATTEMPT TO READ IMAGE METADATA
    // =====================================================
    // If Sharp can extract metadata, buffer is a valid image

    await sharp(buffer).metadata();

    // If we reach here, it's valid
    return true;
  } catch {
    // Sharp threw an error while reading metadata
    // Buffer is not a valid image (corrupted or wrong format)
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
 * Convert RGB color values to hexadecimal color string.
 * Useful for converting Sharp color data to web-friendly hex format.
 *
 * BUSINESS LOGIC:
 * - Takes RGB object with r, g, b values (0-255 each)
 * - Converts each component to 2-digit hex (00-FF)
 * - Returns uppercase hex string with # prefix
 * - Handles decimal values by rounding first
 *
 * HEX COLOR SYSTEM:
 * - Hex uses base-16 (0-9, A-F) to represent RGB
 * - Format: #RRGGBB where each pair is 00-FF
 * - Examples:
 *   - #FF0000 = pure red (r:255, g:0, b:0)
 *   - #00FF00 = pure green (r:0, g:255, b:0)
 *   - #0000FF = pure blue (r:0, g:0, b:255)
 *   - #FFFFFF = white (r:255, g:255, b:255)
 *   - #000000 = black (r:0, g:0, b:0)
 *
 * @param {Object} rgb - RGB color object
 *   - {number} rgb.r - Red component (0-255)
 *   - {number} rgb.g - Green component (0-255)
 *   - {number} rgb.b - Blue component (0-255)
 *
 * @returns {string} Hex color string (e.g., "#4A90D9")
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Convert Sharp's dominant color to hex
 * const hex = rgbToHex({ r: 74, g: 144, b: 217 });
 * // Returns: "#4A90D9"
 *
 * // Use in image metadata
 * const color = rgbToHex(sharpStats.dominant);
 * console.log(`Image dominant color: ${color}`);
 * ```
 */
function rgbToHex({ r, g, b }) {
  // =====================================================
  // DEFINE HEX CONVERSION HELPER
  // =====================================================
  /**
   * toHex(c) - Convert single RGB value (0-255) to 2-digit hex (00-FF)
   *
   * Examples:
   * - 0 → "00"
   * - 15 → "0f"
   * - 255 → "ff"
   * - 74 → "4a"
   */
  const toHex = (c) => {
    // Round to integer (Sharp may return decimals)
    const hex = Math.round(c).toString(16);
    // Ensure 2 digits: "5" becomes "05", "ff" stays "ff"
    return hex.length === 1 ? '0' + hex : hex;
  };

  // =====================================================
  // CONCATENATE HEX COMPONENTS
  // =====================================================
  // Result: #RRGGBB format

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * extractColors(stats)
 * --------------------
 * Extract a simplified color palette from Sharp image statistics.
 * Returns dominant color plus variations for UI theming or color analysis.
 *
 * BUSINESS LOGIC:
 * - Starts with dominant color (most common color in image)
 * - Creates variations based on channel statistics (R, G, B means)
 * - Limits to max 5 colors for performance and usability
 * - Avoids duplicates in palette
 * - Useful for placeholder backgrounds, UI theming, color analysis
 *
 * NOTE: This is a simple palette extraction. For sophisticated color
 * analysis (k-means, perceptual grouping, etc.), use dedicated libraries.
 *
 * HOW IT WORKS:
 * Sharp stats provides:
 * - stats.dominant: The single most common pixel color
 * - stats.channels: Array with R, G, B channel statistics
 *   - Each has mean (average), min, max, etc.
 *
 * We extract:
 * 1. Dominant color (most common)
 * 2. Per-channel averages (emphasizes each color channel)
 *
 * @param {Object} stats - Sharp stats object from image.stats()
 *   - {Object} stats.dominant - RGB object: { r, g, b }
 *   - {Object[]} stats.channels - Array of channel statistics
 *
 * @returns {string[]} Array of hex color strings (max 5)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Extract colors from image
 * const image = sharp(buffer);
 * const stats = await image.stats();
 * const colors = extractColors(stats);
 *
 * // Use for placeholder background
 * console.log(`Dominant color: ${colors[0]}`);
 *
 * // Use for color palette
 * colors.forEach(color => {
 *   console.log(`${color}`);
 * });
 * ```
 */
function extractColors(stats) {
  const colors = [];

  // =====================================================
  // ADD DOMINANT COLOR
  // =====================================================
  // The most common color in the image
  // Usually a good representative for placeholders

  if (stats.dominant) {
    colors.push(rgbToHex(stats.dominant));
  }

  // =====================================================
  // ADD CHANNEL-BASED VARIATIONS
  // =====================================================
  // Create colors emphasizing each RGB channel
  // This gives color palette diversity

  if (stats.channels) {
    stats.channels.forEach((channel, index) => {
      // Only process RGB channels (skip alpha if present)
      // index 0=R, 1=G, 2=B, 3+=alpha/other
      if (index < 3) {
        // Create color emphasizing this channel
        // Use channel average for that component, other channels from image average
        const colorValues = [0, 0, 0];
        colorValues[index] = Math.round(channel.mean);  // This channel gets its mean

        // Only add if we haven't hit the 5-color limit
        if (colors.length < 5) {
          // For other channels, use their means (or default to 128 if missing)
          const hex = rgbToHex({
            r: colorValues[0] || stats.channels[0]?.mean || 128,
            g: colorValues[1] || stats.channels[1]?.mean || 128,
            b: colorValues[2] || stats.channels[2]?.mean || 128,
          });

          // =====================================================
          // AVOID DUPLICATES
          // =====================================================
          // Check if this color already in palette

          if (!colors.includes(hex)) {
            colors.push(hex);
          }
        }
      }
    });
  }

  // =====================================================
  // RETURN LIMITED PALETTE
  // =====================================================
  // Max 5 colors keeps palette manageable

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
