/**
 * File type utilities
 */

// File category icons (lucide-react icon names)
export const categoryIcons = {
  document: 'FileText',
  image: 'Image',
  video: 'Video',
  audio: 'Music',
  archive: 'Archive',
  code: 'Code',
  spreadsheet: 'Table',
  presentation: 'Presentation',
  other: 'File',
};

// File category colors
export const categoryColors = {
  document: '#3B82F6', // blue
  image: '#10B981', // green
  video: '#8B5CF6', // purple
  audio: '#F59E0B', // amber
  archive: '#6B7280', // gray
  code: '#EC4899', // pink
  spreadsheet: '#22C55E', // green
  presentation: '#F97316', // orange
  other: '#6B7280', // gray
};

// Extension to icon mapping for specific file types
export const extensionIcons = {
  // Documents
  '.pdf': 'FileText',
  '.doc': 'FileText',
  '.docx': 'FileText',
  '.rtf': 'FileText',
  '.txt': 'FileText',
  '.md': 'FileText',

  // Spreadsheets
  '.xls': 'Table',
  '.xlsx': 'Table',
  '.csv': 'Table',

  // Presentations
  '.ppt': 'Presentation',
  '.pptx': 'Presentation',
  '.key': 'Presentation',

  // Images
  '.jpg': 'Image',
  '.jpeg': 'Image',
  '.png': 'Image',
  '.gif': 'Image',
  '.webp': 'Image',
  '.svg': 'Image',
  '.bmp': 'Image',

  // Videos
  '.mp4': 'Video',
  '.mov': 'Video',
  '.avi': 'Video',
  '.mkv': 'Video',
  '.webm': 'Video',

  // Audio
  '.mp3': 'Music',
  '.wav': 'Music',
  '.ogg': 'Music',
  '.flac': 'Music',
  '.aac': 'Music',

  // Archives
  '.zip': 'Archive',
  '.rar': 'Archive',
  '.7z': 'Archive',
  '.tar': 'Archive',
  '.gz': 'Archive',

  // Code
  '.js': 'Code',
  '.jsx': 'Code',
  '.ts': 'Code',
  '.tsx': 'Code',
  '.html': 'Code',
  '.css': 'Code',
  '.json': 'Code',
  '.py': 'Code',
  '.java': 'Code',
  '.cpp': 'Code',
  '.c': 'Code',
  '.rb': 'Code',
  '.go': 'Code',
  '.rs': 'Code',
  '.php': 'Code',
};

// Preview support
export const previewableTypes = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  pdf: ['application/pdf'],
  text: ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json'],
};

/**
 * Check if a file can be previewed inline
 */
export function canPreview(mimeType) {
  if (!mimeType) return false;

  for (const types of Object.values(previewableTypes)) {
    if (types.includes(mimeType)) return true;
  }

  return false;
}

/**
 * Get preview type for a file
 */
export function getPreviewType(mimeType) {
  if (!mimeType) return null;

  for (const [type, types] of Object.entries(previewableTypes)) {
    if (types.includes(mimeType)) return type;
  }

  return null;
}

/**
 * Get icon name for a file
 */
export function getFileIcon(file) {
  if (!file) return 'File';

  // Check extension first for more specific icons
  if (file.extension && extensionIcons[file.extension.toLowerCase()]) {
    return extensionIcons[file.extension.toLowerCase()];
  }

  // Fall back to category
  if (file.fileCategory && categoryIcons[file.fileCategory]) {
    return categoryIcons[file.fileCategory];
  }

  return 'File';
}

/**
 * Get color for a file category
 */
export function getCategoryColor(category) {
  return categoryColors[category] || categoryColors.other;
}

/**
 * Get category label
 */
export function getCategoryLabel(category) {
  const labels = {
    document: 'Document',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    archive: 'Archive',
    code: 'Code',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    other: 'Other',
  };
  return labels[category] || 'Other';
}

/**
 * File categories for filtering
 */
export const fileCategories = [
  { value: 'document', label: 'Documents', icon: 'FileText' },
  { value: 'image', label: 'Images', icon: 'Image' },
  { value: 'video', label: 'Videos', icon: 'Video' },
  { value: 'audio', label: 'Audio', icon: 'Music' },
  { value: 'archive', label: 'Archives', icon: 'Archive' },
  { value: 'code', label: 'Code', icon: 'Code' },
  { value: 'spreadsheet', label: 'Spreadsheets', icon: 'Table' },
  { value: 'presentation', label: 'Presentations', icon: 'Presentation' },
  { value: 'other', label: 'Other', icon: 'File' },
];

/**
 * Get human-readable file type name
 */
export function getFileTypeName(mimeType, extension) {
  if (!mimeType && !extension) return 'Unknown';

  const typeMap = {
    'application/pdf': 'PDF',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'application/zip': 'ZIP Archive',
    'application/x-rar-compressed': 'RAR Archive',
    'application/x-7z-compressed': '7-Zip Archive',
    'application/json': 'JSON',
    'text/plain': 'Text File',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'text/javascript': 'JavaScript',
  };

  if (mimeType) {
    if (typeMap[mimeType]) return typeMap[mimeType];
    if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase() + ' Image';
    if (mimeType.startsWith('video/')) return mimeType.split('/')[1].toUpperCase() + ' Video';
    if (mimeType.startsWith('audio/')) return mimeType.split('/')[1].toUpperCase() + ' Audio';
  }

  if (extension) {
    return extension.toUpperCase().replace('.', '') + ' File';
  }

  return 'Unknown';
}
