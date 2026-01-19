import sharp from 'sharp';

/**
 * Image Processing Service
 * Uses Sharp for fast image manipulation and thumbnail generation
 */

// Default configuration
const DEFAULT_CONFIG = {
  thumbnail: {
    width: 300,
    height: 300,
    fit: 'cover',
    position: 'center',
    quality: 80,
    format: 'jpeg',
  },
  preview: {
    maxWidth: 1200,
    quality: 85,
    format: 'jpeg',
  },
  original: {
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 90,
  },
};

/**
 * Process an uploaded image
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Processing options
 * @returns {Promise<{original: Buffer, thumbnail: Buffer, preview: Buffer, metadata: Object}>}
 */
export async function processImage(buffer, options = {}) {
  const {
    generateThumbnail = true,
    generatePreview = false,
    optimizeOriginal = true,
    thumbnailConfig = {},
    previewConfig = {},
    originalConfig = {},
  } = options;

  const thumbConfig = { ...DEFAULT_CONFIG.thumbnail, ...thumbnailConfig };
  const prevConfig = { ...DEFAULT_CONFIG.preview, ...previewConfig };
  const origConfig = { ...DEFAULT_CONFIG.original, ...originalConfig };

  // Get metadata first
  const metadata = await extractMetadata(buffer);
  const results = {
    original: buffer,
    thumbnail: null,
    preview: null,
    metadata,
  };

  // Process original (optimize if needed)
  if (optimizeOriginal && (metadata.width > origConfig.maxWidth || metadata.height > origConfig.maxHeight)) {
    results.original = await sharp(buffer)
      .resize(origConfig.maxWidth, origConfig.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: origConfig.quality, mozjpeg: true })
      .toBuffer();

    // Update metadata for resized image
    const newMeta = await sharp(results.original).metadata();
    results.metadata.width = newMeta.width;
    results.metadata.height = newMeta.height;
    results.metadata.wasResized = true;
  }

  // Generate thumbnail
  if (generateThumbnail) {
    results.thumbnail = await sharp(buffer)
      .resize(thumbConfig.width, thumbConfig.height, {
        fit: thumbConfig.fit,
        position: thumbConfig.position,
      })
      .jpeg({ quality: thumbConfig.quality })
      .toBuffer();
  }

  // Generate preview (medium-sized)
  if (generatePreview) {
    results.preview = await sharp(buffer)
      .resize(prevConfig.maxWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: prevConfig.quality })
      .toBuffer();
  }

  return results;
}

/**
 * Extract metadata from an image
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<Object>}
 */
export async function extractMetadata(buffer) {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const stats = await image.stats();

  // Calculate aspect ratio
  const aspectRatio = metadata.width && metadata.height
    ? parseFloat((metadata.width / metadata.height).toFixed(4))
    : null;

  // Extract dominant color and color palette
  const dominantColor = rgbToHex(stats.dominant);
  const colors = extractColors(stats);

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    space: metadata.space,
    channels: metadata.channels,
    depth: metadata.depth,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
    aspectRatio,
    dominantColor,
    colors,
    isAnimated: metadata.pages > 1,
    pages: metadata.pages || 1,
  };
}

/**
 * Generate a thumbnail from an image
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Thumbnail options
 * @returns {Promise<Buffer>}
 */
export async function generateThumbnail(buffer, options = {}) {
  const config = { ...DEFAULT_CONFIG.thumbnail, ...options };

  return sharp(buffer)
    .resize(config.width, config.height, {
      fit: config.fit,
      position: config.position,
    })
    .jpeg({ quality: config.quality })
    .toBuffer();
}

/**
 * Resize an image
 * @param {Buffer} buffer - Image buffer
 * @param {number} width - Target width
 * @param {number} height - Target height (optional)
 * @param {Object} options - Resize options
 * @returns {Promise<Buffer>}
 */
export async function resizeImage(buffer, width, height = null, options = {}) {
  const {
    fit = 'inside',
    position = 'center',
    withoutEnlargement = true,
    format = 'jpeg',
    quality = 85,
  } = options;

  let pipeline = sharp(buffer)
    .resize(width, height, {
      fit,
      position,
      withoutEnlargement,
    });

  // Apply format
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
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.toBuffer();
}

/**
 * Convert image to different format
 * @param {Buffer} buffer - Image buffer
 * @param {string} format - Target format (jpeg, png, webp, avif)
 * @param {Object} options - Format options
 * @returns {Promise<Buffer>}
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
      pipeline = pipeline.gif();
      break;
    default:
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.toBuffer();
}

/**
 * Apply image transformations
 * @param {Buffer} buffer - Image buffer
 * @param {Object} transforms - Transformation options
 * @returns {Promise<Buffer>}
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

  if (rotate) {
    pipeline = pipeline.rotate(rotate);
  }

  if (flip) {
    pipeline = pipeline.flip();
  }

  if (flop) {
    pipeline = pipeline.flop();
  }

  if (sharpen) {
    pipeline = pipeline.sharpen(
      typeof sharpen === 'object' ? sharpen : undefined
    );
  }

  if (blur && blur > 0) {
    pipeline = pipeline.blur(blur);
  }

  if (grayscale) {
    pipeline = pipeline.grayscale();
  }

  if (negate) {
    pipeline = pipeline.negate();
  }

  if (normalize) {
    pipeline = pipeline.normalize();
  }

  if (gamma) {
    pipeline = pipeline.gamma(gamma);
  }

  if (brightness !== undefined || saturation !== undefined) {
    pipeline = pipeline.modulate({
      brightness: brightness || 1,
      saturation: saturation || 1,
    });
  }

  return pipeline.toBuffer();
}

/**
 * Crop image to specified dimensions
 * @param {Buffer} buffer - Image buffer
 * @param {Object} cropOptions - Crop options
 * @returns {Promise<Buffer>}
 */
export async function cropImage(buffer, cropOptions) {
  const { left = 0, top = 0, width, height } = cropOptions;

  return sharp(buffer)
    .extract({ left, top, width, height })
    .toBuffer();
}

/**
 * Check if a buffer is a valid image
 * @param {Buffer} buffer - Buffer to check
 * @returns {Promise<boolean>}
 */
export async function isValidImage(buffer) {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get supported formats
 * @returns {Promise<Object>}
 */
export async function getSupportedFormats() {
  return sharp.format;
}

// Helper functions

/**
 * Convert RGB object to hex color
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {string}
 */
function rgbToHex({ r, g, b }) {
  const toHex = (c) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extract color palette from stats
 * @param {Object} stats - Sharp stats object
 * @returns {string[]}
 */
function extractColors(stats) {
  const colors = [];

  // Add dominant color
  if (stats.dominant) {
    colors.push(rgbToHex(stats.dominant));
  }

  // Add channel-based colors (simplified palette)
  if (stats.channels) {
    // Create variations based on channel stats
    stats.channels.forEach((channel, index) => {
      if (index < 3) { // RGB only
        const colorValues = [0, 0, 0];
        colorValues[index] = Math.round(channel.mean);
        if (colors.length < 5) {
          const hex = rgbToHex({
            r: colorValues[0] || stats.channels[0]?.mean || 128,
            g: colorValues[1] || stats.channels[1]?.mean || 128,
            b: colorValues[2] || stats.channels[2]?.mean || 128,
          });
          if (!colors.includes(hex)) {
            colors.push(hex);
          }
        }
      }
    });
  }

  return colors.slice(0, 5);
}

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
