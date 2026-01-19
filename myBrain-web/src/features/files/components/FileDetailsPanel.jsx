import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  Loader2,
  Trash2,
  Download,
  Share2,
  Move,
  Star,
  StarOff,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Table,
  Presentation,
  File,
  Save,
  RotateCcw,
  History,
  Link as LinkIcon,
  Lock,
  Clock
} from 'lucide-react';
import {
  useFile,
  useUpdateFile,
  useDeleteFile,
  useTrashFile,
  useRestoreFile,
  useToggleFileFavorite,
  useDownloadFile
} from '../hooks/useFiles';
import { formatBytes, formatDate, formatRelativeDate } from '../utils/formatters';
import { getFileIcon, getCategoryColor, getCategoryLabel, getFileTypeName, canPreview, getPreviewType } from '../utils/fileTypes';
import TagsSection from '../../../components/shared/TagsSection';
import Tooltip from '../../../components/ui/Tooltip';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import useToast from '../../../hooks/useToast';

// File type icons mapping
const iconComponents = {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Table,
  Presentation,
  File,
};

// Save status indicator
function SaveStatus({ status, lastSaved }) {
  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [timeAgo, setTimeAgo] = useState(getTimeAgo(lastSaved));

  useEffect(() => {
    if (status === 'saved' && lastSaved) {
      const interval = setInterval(() => {
        setTimeAgo(getTimeAgo(lastSaved));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, lastSaved]);

  useEffect(() => {
    setTimeAgo(getTimeAgo(lastSaved));
  }, [lastSaved]);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'saving' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-muted animate-pulse" />
          <span className="text-muted">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span className="text-muted">Saved {timeAgo}</span>
        </>
      )}
      {status === 'unsaved' && (
        <>
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-muted">Editing</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-500">Failed</span>
        </>
      )}
    </div>
  );
}

// File Preview component
function FilePreview({ file }) {
  const previewType = getPreviewType(file.mimeType);

  if (file.thumbnailUrl) {
    return (
      <div className="relative w-full aspect-video bg-bg rounded-lg overflow-hidden flex items-center justify-center">
        <img
          src={file.thumbnailUrl}
          alt={file.originalName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (previewType === 'image' && file.previewUrl) {
    return (
      <div className="relative w-full aspect-video bg-bg rounded-lg overflow-hidden flex items-center justify-center">
        <img
          src={file.previewUrl}
          alt={file.originalName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // Show file type icon for non-previewable files
  const iconName = getFileIcon(file);
  const IconComponent = iconComponents[iconName] || File;
  const color = getCategoryColor(file.fileCategory);

  return (
    <div className="w-full aspect-video bg-bg rounded-lg flex items-center justify-center">
      <IconComponent className="w-20 h-20" style={{ color }} />
    </div>
  );
}

// File metadata row
function MetadataRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-text truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function FileDetailsPanel({ file: initialFile, onClose, onUpdated, onDeleted }) {
  const toast = useToast();
  const fileId = initialFile?._id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSavedRef = useRef({ title: '', description: '', tags: [] });

  const { data: file, isLoading, refetch } = useFile(fileId);
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const trashFile = useTrashFile();
  const restoreFile = useRestoreFile();
  const toggleFavorite = useToggleFileFavorite();
  const downloadFile = useDownloadFile();

  // Initialize form with file data
  useEffect(() => {
    if (file) {
      setTitle(file.title || '');
      setDescription(file.description || '');
      setTags(file.tags || []);
      lastSavedRef.current = {
        title: file.title || '',
        description: file.description || '',
        tags: file.tags || [],
      };
      setLastSaved(new Date(file.updatedAt));
      setSaveStatus('saved');
    }
  }, [file]);

  // Auto-save logic
  const saveFile = useCallback(async () => {
    if (!fileId) return;

    const hasChanges =
      title !== lastSavedRef.current.title ||
      description !== lastSavedRef.current.description ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (!hasChanges) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    try {
      await updateFile.mutateAsync({
        id: fileId,
        data: { title, description, tags }
      });
      lastSavedRef.current = { title, description, tags };
      setSaveStatus('saved');
      setLastSaved(new Date());
      onUpdated?.();

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');

      retryTimeoutRef.current = setTimeout(() => {
        saveFile();
      }, 5000);
    }
  }, [fileId, title, description, tags, updateFile, onUpdated]);

  // Debounced auto-save
  useEffect(() => {
    if (!fileId) return;

    const hasChanges =
      title !== lastSavedRef.current.title ||
      description !== lastSavedRef.current.description ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (hasChanges) {
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveFile();
      }, 1500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, tags, fileId, saveFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saveFile]);

  const handleDownload = async () => {
    try {
      const result = await downloadFile.mutateAsync(fileId);
      if (result?.url) {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      toast.error('Failed to get download URL');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite.mutateAsync(fileId);
      refetch();
      onUpdated?.();
    } catch (err) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleTrash = async () => {
    try {
      await trashFile.mutateAsync(fileId);
      toast.success('File moved to trash');
      onDeleted?.();
    } catch (err) {
      toast.error('Failed to move file to trash');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreFile.mutateAsync(fileId);
      toast.success('File restored');
      refetch();
      onUpdated?.();
    } catch (err) {
      toast.error('Failed to restore file');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFile.mutateAsync(fileId);
      toast.success('File permanently deleted');
      onDeleted?.();
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  const currentFile = file || initialFile;
  const isTrashed = currentFile?.isTrashed;
  const isFavorite = currentFile?.favorite;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 opacity-100"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-panel border-l border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out translate-x-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Tooltip content="Close (Esc)" position="bottom">
              <button
                onClick={onClose}
                className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </Tooltip>

            {!isLoading && (
              <>
                <SaveStatus status={saveStatus} lastSaved={lastSaved} />
                <button
                  onClick={() => {
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    saveFile();
                  }}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isTrashed ? (
              <>
                <Tooltip content="Restore" position="bottom">
                  <button
                    onClick={handleRestore}
                    className="p-2.5 sm:p-1.5 hover:bg-green-500/10 active:bg-green-500/20 rounded-lg transition-colors text-muted hover:text-green-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Delete Permanently" position="bottom">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip content="Download" position="bottom">
                  <button
                    onClick={handleDownload}
                    className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors text-muted hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
                <Tooltip content={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'} position="bottom">
                  <button
                    onClick={handleToggleFavorite}
                    className={`p-2.5 sm:p-1.5 hover:bg-yellow-500/10 active:bg-yellow-500/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      isFavorite ? 'text-yellow-500' : 'text-muted hover:text-yellow-500'
                    }`}
                  >
                    {isFavorite ? (
                      <Star className="w-5 h-5 sm:w-4 sm:h-4 fill-current" />
                    ) : (
                      <StarOff className="w-5 h-5 sm:w-4 sm:h-4" />
                    )}
                  </button>
                </Tooltip>
                <Tooltip content="Move to Trash" position="bottom">
                  <button
                    onClick={handleTrash}
                    className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : currentFile ? (
          <div className="flex-1 overflow-auto p-4">
            {/* File Preview */}
            <FilePreview file={currentFile} />

            {/* File Name */}
            <h2 className="text-lg font-semibold text-text mt-4 truncate">
              {currentFile.originalName}
            </h2>

            {/* Title input */}
            <div className="mt-4">
              <label className="block text-xs text-muted mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a title..."
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-xs text-muted mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full min-h-[80px] px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
              />
            </div>

            {/* Tags */}
            <TagsSection tags={tags} onChange={setTags} />

            {/* File Details */}
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-text mb-3">File Details</h3>

              <div className="space-y-1 divide-y divide-border/50">
                <MetadataRow
                  label="Type"
                  value={getFileTypeName(currentFile.mimeType, currentFile.extension)}
                  icon={FileText}
                />
                <MetadataRow
                  label="Size"
                  value={formatBytes(currentFile.size)}
                  icon={Archive}
                />
                {currentFile.width && currentFile.height && (
                  <MetadataRow
                    label="Dimensions"
                    value={`${currentFile.width} × ${currentFile.height}`}
                    icon={Image}
                  />
                )}
                <MetadataRow
                  label="Category"
                  value={getCategoryLabel(currentFile.fileCategory)}
                  icon={File}
                />
                <MetadataRow
                  label="Uploaded"
                  value={formatDate(currentFile.createdAt, { includeTime: true })}
                  icon={Clock}
                />
                <MetadataRow
                  label="Modified"
                  value={formatRelativeDate(currentFile.updatedAt)}
                  icon={History}
                />
                {currentFile.downloadCount > 0 && (
                  <MetadataRow
                    label="Downloads"
                    value={currentFile.downloadCount.toString()}
                    icon={Download}
                  />
                )}
              </div>
            </div>

            {/* Version Info */}
            {currentFile.version > 1 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Version {currentFile.version}
                </h3>
                <p className="text-xs text-muted">
                  This file has been updated {currentFile.version - 1} time{currentFile.version > 2 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Share Info */}
            {currentFile.shareSettings?.publicUrl && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Shared
                </h3>
                <div className="flex items-center gap-2 p-3 bg-bg rounded-lg">
                  {currentFile.shareSettings.password && (
                    <Lock className="w-4 h-4 text-muted" />
                  )}
                  <span className="text-xs text-muted flex-1 truncate">
                    {currentFile.shareSettings.publicUrl}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentFile.shareSettings.publicUrl);
                      toast.success('Link copied');
                    }}
                    className="p-1 hover:bg-panel rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-muted" />
                  </button>
                </div>
                {currentFile.shareSettings.publicUrlExpiry && (
                  <p className="text-xs text-muted mt-2">
                    Expires {formatRelativeDate(currentFile.shareSettings.publicUrlExpiry)}
                  </p>
                )}
              </div>
            )}

            {/* Linked Entities */}
            {(currentFile.linkedProjectIds?.length > 0 ||
              currentFile.linkedTaskIds?.length > 0 ||
              currentFile.linkedNoteIds?.length > 0) && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Linked To
                </h3>
                <div className="space-y-2">
                  {currentFile.linkedProjectIds?.length > 0 && (
                    <p className="text-xs text-muted">
                      {currentFile.linkedProjectIds.length} project{currentFile.linkedProjectIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {currentFile.linkedTaskIds?.length > 0 && (
                    <p className="text-xs text-muted">
                      {currentFile.linkedTaskIds.length} task{currentFile.linkedTaskIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {currentFile.linkedNoteIds?.length > 0 && (
                    <p className="text-xs text-muted">
                      {currentFile.linkedNoteIds.length} note{currentFile.linkedNoteIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted">File not found</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete File Permanently"
        message="Are you sure you want to permanently delete this file? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
