import { describe, it, expect } from 'vitest';
import {
  categoryIcons,
  categoryColors,
  extensionIcons,
  previewableTypes,
  canPreview,
  getPreviewType,
  getFileIcon,
  getCategoryColor,
  getCategoryLabel,
  fileCategories,
  getFileTypeName,
} from './fileTypes';

describe('fileTypes utilities', () => {
  // Test categoryIcons
  describe('categoryIcons', () => {
    it('has icons for all expected categories', () => {
      expect(categoryIcons.document).toBe('FileText');
      expect(categoryIcons.image).toBe('Image');
      expect(categoryIcons.video).toBe('Video');
      expect(categoryIcons.audio).toBe('Music');
      expect(categoryIcons.archive).toBe('Archive');
      expect(categoryIcons.code).toBe('Code');
      expect(categoryIcons.spreadsheet).toBe('Table');
      expect(categoryIcons.presentation).toBe('Presentation');
      expect(categoryIcons.other).toBe('File');
    });
  });

  // Test categoryColors
  describe('categoryColors', () => {
    it('has colors for all expected categories', () => {
      expect(categoryColors.document).toBe('#3B82F6');
      expect(categoryColors.image).toBe('#10B981');
      expect(categoryColors.video).toBe('#8B5CF6');
      expect(categoryColors.audio).toBe('#F59E0B');
      expect(categoryColors.archive).toBe('#6B7280');
      expect(categoryColors.code).toBe('#EC4899');
      expect(categoryColors.spreadsheet).toBe('#22C55E');
      expect(categoryColors.presentation).toBe('#F97316');
      expect(categoryColors.other).toBe('#6B7280');
    });
  });

  // Test extensionIcons
  describe('extensionIcons', () => {
    it('maps document extensions correctly', () => {
      expect(extensionIcons['.pdf']).toBe('FileText');
      expect(extensionIcons['.doc']).toBe('FileText');
      expect(extensionIcons['.docx']).toBe('FileText');
      expect(extensionIcons['.txt']).toBe('FileText');
      expect(extensionIcons['.md']).toBe('FileText');
    });

    it('maps spreadsheet extensions correctly', () => {
      expect(extensionIcons['.xls']).toBe('Table');
      expect(extensionIcons['.xlsx']).toBe('Table');
      expect(extensionIcons['.csv']).toBe('Table');
    });

    it('maps image extensions correctly', () => {
      expect(extensionIcons['.jpg']).toBe('Image');
      expect(extensionIcons['.jpeg']).toBe('Image');
      expect(extensionIcons['.png']).toBe('Image');
      expect(extensionIcons['.gif']).toBe('Image');
      expect(extensionIcons['.svg']).toBe('Image');
    });

    it('maps video extensions correctly', () => {
      expect(extensionIcons['.mp4']).toBe('Video');
      expect(extensionIcons['.mov']).toBe('Video');
      expect(extensionIcons['.avi']).toBe('Video');
    });

    it('maps audio extensions correctly', () => {
      expect(extensionIcons['.mp3']).toBe('Music');
      expect(extensionIcons['.wav']).toBe('Music');
      expect(extensionIcons['.ogg']).toBe('Music');
    });

    it('maps archive extensions correctly', () => {
      expect(extensionIcons['.zip']).toBe('Archive');
      expect(extensionIcons['.rar']).toBe('Archive');
      expect(extensionIcons['.7z']).toBe('Archive');
    });

    it('maps code extensions correctly', () => {
      expect(extensionIcons['.js']).toBe('Code');
      expect(extensionIcons['.jsx']).toBe('Code');
      expect(extensionIcons['.ts']).toBe('Code');
      expect(extensionIcons['.tsx']).toBe('Code');
      expect(extensionIcons['.html']).toBe('Code');
      expect(extensionIcons['.css']).toBe('Code');
      expect(extensionIcons['.py']).toBe('Code');
    });
  });

  // Test canPreview function
  describe('canPreview', () => {
    it('returns true for previewable image types', () => {
      expect(canPreview('image/jpeg')).toBe(true);
      expect(canPreview('image/png')).toBe(true);
      expect(canPreview('image/gif')).toBe(true);
      expect(canPreview('image/webp')).toBe(true);
      expect(canPreview('image/svg+xml')).toBe(true);
    });

    it('returns true for previewable video types', () => {
      expect(canPreview('video/mp4')).toBe(true);
      expect(canPreview('video/webm')).toBe(true);
      expect(canPreview('video/ogg')).toBe(true);
    });

    it('returns true for previewable audio types', () => {
      expect(canPreview('audio/mpeg')).toBe(true);
      expect(canPreview('audio/wav')).toBe(true);
      expect(canPreview('audio/ogg')).toBe(true);
    });

    it('returns true for PDF files', () => {
      expect(canPreview('application/pdf')).toBe(true);
    });

    it('returns true for text types', () => {
      expect(canPreview('text/plain')).toBe(true);
      expect(canPreview('text/html')).toBe(true);
      expect(canPreview('text/css')).toBe(true);
      expect(canPreview('application/json')).toBe(true);
    });

    it('returns false for non-previewable types', () => {
      expect(canPreview('application/msword')).toBe(false);
      expect(canPreview('application/zip')).toBe(false);
      expect(canPreview('application/octet-stream')).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(canPreview(null)).toBe(false);
      expect(canPreview(undefined)).toBe(false);
      expect(canPreview('')).toBe(false);
    });
  });

  // Test getPreviewType function
  describe('getPreviewType', () => {
    it('returns "image" for image MIME types', () => {
      expect(getPreviewType('image/jpeg')).toBe('image');
      expect(getPreviewType('image/png')).toBe('image');
    });

    it('returns "video" for video MIME types', () => {
      expect(getPreviewType('video/mp4')).toBe('video');
      expect(getPreviewType('video/webm')).toBe('video');
    });

    it('returns "audio" for audio MIME types', () => {
      expect(getPreviewType('audio/mpeg')).toBe('audio');
      expect(getPreviewType('audio/wav')).toBe('audio');
    });

    it('returns "pdf" for PDF MIME type', () => {
      expect(getPreviewType('application/pdf')).toBe('pdf');
    });

    it('returns "text" for text MIME types', () => {
      expect(getPreviewType('text/plain')).toBe('text');
      expect(getPreviewType('text/html')).toBe('text');
    });

    it('returns null for non-previewable types', () => {
      expect(getPreviewType('application/zip')).toBe(null);
      expect(getPreviewType('application/msword')).toBe(null);
    });

    it('returns null for null or undefined', () => {
      expect(getPreviewType(null)).toBe(null);
      expect(getPreviewType(undefined)).toBe(null);
    });
  });

  // Test getFileIcon function
  describe('getFileIcon', () => {
    it('returns File for null/undefined file', () => {
      expect(getFileIcon(null)).toBe('File');
      expect(getFileIcon(undefined)).toBe('File');
    });

    it('returns icon based on extension when available', () => {
      expect(getFileIcon({ extension: '.pdf' })).toBe('FileText');
      expect(getFileIcon({ extension: '.jpg' })).toBe('Image');
      expect(getFileIcon({ extension: '.mp4' })).toBe('Video');
      expect(getFileIcon({ extension: '.js' })).toBe('Code');
      expect(getFileIcon({ extension: '.zip' })).toBe('Archive');
    });

    it('returns icon based on extension case-insensitively', () => {
      expect(getFileIcon({ extension: '.PDF' })).toBe('FileText');
      expect(getFileIcon({ extension: '.JPG' })).toBe('Image');
    });

    it('falls back to category icon when extension not found', () => {
      expect(getFileIcon({ extension: '.unknown', fileCategory: 'image' })).toBe('Image');
      expect(getFileIcon({ extension: '.unknown', fileCategory: 'video' })).toBe('Video');
    });

    it('returns File for unknown extension and category', () => {
      expect(getFileIcon({ extension: '.unknown' })).toBe('File');
      expect(getFileIcon({ extension: '.xyz', fileCategory: 'unknown' })).toBe('File');
    });
  });

  // Test getCategoryColor function
  describe('getCategoryColor', () => {
    it('returns correct color for each category', () => {
      expect(getCategoryColor('document')).toBe('#3B82F6');
      expect(getCategoryColor('image')).toBe('#10B981');
      expect(getCategoryColor('video')).toBe('#8B5CF6');
      expect(getCategoryColor('audio')).toBe('#F59E0B');
    });

    it('returns other color for unknown category', () => {
      expect(getCategoryColor('unknown')).toBe('#6B7280');
      expect(getCategoryColor(null)).toBe('#6B7280');
      expect(getCategoryColor(undefined)).toBe('#6B7280');
    });
  });

  // Test getCategoryLabel function
  describe('getCategoryLabel', () => {
    it('returns correct label for each category', () => {
      expect(getCategoryLabel('document')).toBe('Document');
      expect(getCategoryLabel('image')).toBe('Image');
      expect(getCategoryLabel('video')).toBe('Video');
      expect(getCategoryLabel('audio')).toBe('Audio');
      expect(getCategoryLabel('archive')).toBe('Archive');
      expect(getCategoryLabel('code')).toBe('Code');
      expect(getCategoryLabel('spreadsheet')).toBe('Spreadsheet');
      expect(getCategoryLabel('presentation')).toBe('Presentation');
    });

    it('returns "Other" for unknown category', () => {
      expect(getCategoryLabel('unknown')).toBe('Other');
      expect(getCategoryLabel(null)).toBe('Other');
      expect(getCategoryLabel(undefined)).toBe('Other');
    });
  });

  // Test fileCategories array
  describe('fileCategories', () => {
    it('contains all expected categories', () => {
      expect(fileCategories).toHaveLength(9);
      const values = fileCategories.map(c => c.value);
      expect(values).toContain('document');
      expect(values).toContain('image');
      expect(values).toContain('video');
      expect(values).toContain('audio');
      expect(values).toContain('archive');
      expect(values).toContain('code');
      expect(values).toContain('spreadsheet');
      expect(values).toContain('presentation');
      expect(values).toContain('other');
    });

    it('has correct structure for each category', () => {
      fileCategories.forEach(cat => {
        expect(cat).toHaveProperty('value');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('icon');
      });
    });
  });

  // Test getFileTypeName function
  describe('getFileTypeName', () => {
    it('returns correct name for known MIME types', () => {
      expect(getFileTypeName('application/pdf')).toBe('PDF');
      expect(getFileTypeName('application/msword')).toBe('Word Document');
      expect(getFileTypeName('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Word Document');
      expect(getFileTypeName('application/vnd.ms-excel')).toBe('Excel Spreadsheet');
      expect(getFileTypeName('application/zip')).toBe('ZIP Archive');
      expect(getFileTypeName('application/json')).toBe('JSON');
      expect(getFileTypeName('text/plain')).toBe('Text File');
    });

    it('formats image MIME types correctly', () => {
      expect(getFileTypeName('image/jpeg')).toBe('JPEG Image');
      expect(getFileTypeName('image/png')).toBe('PNG Image');
      expect(getFileTypeName('image/gif')).toBe('GIF Image');
    });

    it('formats video MIME types correctly', () => {
      expect(getFileTypeName('video/mp4')).toBe('MP4 Video');
      expect(getFileTypeName('video/webm')).toBe('WEBM Video');
    });

    it('formats audio MIME types correctly', () => {
      expect(getFileTypeName('audio/mpeg')).toBe('MPEG Audio');
      expect(getFileTypeName('audio/wav')).toBe('WAV Audio');
    });

    it('uses extension when MIME type not available', () => {
      expect(getFileTypeName(null, '.pdf')).toBe('PDF File');
      expect(getFileTypeName(null, '.docx')).toBe('DOCX File');
      expect(getFileTypeName(undefined, '.js')).toBe('JS File');
    });

    it('returns Unknown when no MIME type or extension', () => {
      expect(getFileTypeName()).toBe('Unknown');
      expect(getFileTypeName(null, null)).toBe('Unknown');
      expect(getFileTypeName('', '')).toBe('Unknown');
    });
  });
});
