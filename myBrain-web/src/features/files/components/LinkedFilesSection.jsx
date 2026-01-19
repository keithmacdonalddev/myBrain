import { useState } from 'react';
import {
  Paperclip,
  Plus,
  X,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useFilesForEntity, useLinkFile, useUnlinkFile, useDownloadFile } from '../hooks/useFiles';
import { formatBytes, formatRelativeDate } from '../utils/formatters';
import { getFileIcon, getCategoryColor } from '../utils/fileTypes';
import useToast from '../../../hooks/useToast';

// Icon components map
const iconComponents = {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
};

function FileIcon({ file, size = 'sm' }) {
  const iconName = getFileIcon(file);
  const IconComponent = iconComponents[iconName] || File;
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-8 h-8';

  // For images, show thumbnail if available
  if (file.fileCategory === 'image' && file.thumbnailUrl) {
    const imgSize = size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12';
    return (
      <img
        src={file.thumbnailUrl}
        alt=""
        className={`${imgSize} object-cover rounded`}
      />
    );
  }

  return (
    <IconComponent
      className={sizeClass}
      style={{ color: getCategoryColor(file.fileCategory) }}
    />
  );
}

function LinkedFileItem({ file, onRemove, onDownload, isRemoving }) {
  return (
    <div className="flex items-center gap-3 p-2 bg-bg rounded-lg group">
      <FileIcon file={file} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">
          {file.title || file.originalName}
        </p>
        <p className="text-xs text-muted">
          {formatBytes(file.size)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDownload(file)}
          className="p-1 rounded hover:bg-panel text-muted hover:text-text"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove(file._id)}
          disabled={isRemoving}
          className="p-1 rounded hover:bg-red-500/10 text-muted hover:text-red-500"
          title="Remove"
        >
          {isRemoving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function LinkedFilesSection({
  entityType,  // 'project' | 'task' | 'note'
  entityId,
  maxFiles = 10,
  onFilesChanged,
  compact = false,
}) {
  const toast = useToast();
  const [removingId, setRemovingId] = useState(null);

  const { data: files = [], isLoading, refetch } = useFilesForEntity(entityType, entityId);
  const unlinkFile = useUnlinkFile();
  const downloadFile = useDownloadFile();

  const handleRemove = async (fileId) => {
    setRemovingId(fileId);
    try {
      await unlinkFile.mutateAsync({
        id: fileId,
        entityId,
        entityType,
      });
      refetch();
      onFilesChanged?.();
    } catch (err) {
      toast.error('Failed to remove file');
    }
    setRemovingId(null);
  };

  const handleDownload = async (file) => {
    try {
      const result = await downloadFile.mutateAsync(file._id);
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  if (!entityId) return null;

  return (
    <div className={compact ? 'mt-3' : 'mt-4 pt-4 border-t border-border'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-muted" />
          <span className="text-sm text-muted">
            Files {files.length > 0 && `(${files.length})`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-muted animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted py-2">No files attached</p>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <LinkedFileItem
              key={file._id}
              file={file}
              onRemove={handleRemove}
              onDownload={handleDownload}
              isRemoving={removingId === file._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
