import { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Pencil,
  Trash2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  HardDrive,
  Maximize2,
  Image as ImageIcon,
  Palette,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useUpdateImage, useToggleFavorite, useDeleteImage } from '../hooks/useImages';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import useToast from '../../../hooks/useToast';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function ImageDetailsModal({
  image,
  images = [],
  onClose,
  onNavigate,
  onDeleted
}) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [alt, setAlt] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateImage = useUpdateImage();
  const toggleFavorite = useToggleFavorite();
  const deleteImage = useDeleteImage();

  // Find current index
  const currentIndex = images.findIndex(img => img._id === image?._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  // Initialize form state
  useEffect(() => {
    if (image) {
      setTitle(image.title || '');
      setDescription(image.description || '');
      setAlt(image.alt || '');
      setTags(image.tags || []);
      setIsEditing(false);
    }
  }, [image]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!image) return;

      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft' && hasPrev && !isEditing) {
        onNavigate(images[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext && !isEditing) {
        onNavigate(images[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, images, currentIndex, hasPrev, hasNext, isEditing, onClose, onNavigate]);

  if (!image) return null;

  const handleSave = async () => {
    try {
      await updateImage.mutateAsync({
        id: image._id,
        data: { title, description, alt, tags }
      });
      toast.success('Image updated');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update image');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite.mutateAsync(image._id);
    } catch (err) {
      toast.error('Failed to update favorite');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteImage.mutateAsync(image._id);
      toast.success('Image deleted');
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.secureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.secureUrl;
    link.download = image.originalName || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 z-50 flex">
        {/* Image Section */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Navigation */}
          {hasPrev && (
            <button
              onClick={() => onNavigate(images[currentIndex - 1])}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onNavigate(images[currentIndex + 1])}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={image.secureUrl}
            alt={image.alt || image.originalName}
            className="max-w-full max-h-full object-contain"
          />

          {/* Close button (mobile) */}
          <button
            onClick={onClose}
            className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Panel */}
        <div className="hidden md:flex w-80 lg:w-96 bg-panel border-l border-border flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-medium text-text truncate flex-1">
              {image.title || image.originalName}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-bg rounded-lg text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isEditing ? (
              /* Edit Mode */
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Image title..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="Image description..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Alt text for accessibility..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-primary/70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add tag and press Enter..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={updateImage.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
                  >
                    {updateImage.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-bg border border-border rounded-lg text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="p-4 space-y-4">
                {/* Description */}
                {image.description && (
                  <p className="text-sm text-text">{image.description}</p>
                )}

                {/* Tags */}
                {image.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {image.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4 text-muted" />
                    <span className="text-muted">Type:</span>
                    <span className="text-text">{image.format?.toUpperCase()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Maximize2 className="w-4 h-4 text-muted" />
                    <span className="text-muted">Size:</span>
                    <span className="text-text">
                      {image.width} x {image.height}px
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="w-4 h-4 text-muted" />
                    <span className="text-muted">File size:</span>
                    <span className="text-text">{formatBytes(image.size)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-muted">Uploaded:</span>
                    <span className="text-text">
                      {format(new Date(image.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Colors */}
                  {image.colors?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Palette className="w-4 h-4 text-muted" />
                      <span className="text-muted">Colors:</span>
                      <div className="flex gap-1">
                        {image.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Original filename */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted">
                    Original: {image.originalName}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    image.favorite
                      ? 'bg-red-500/10 border-red-500/30 text-red-500'
                      : 'bg-bg border-border text-muted hover:text-text'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${image.favorite ? 'fill-current' : ''}`} />
                  {image.favorite ? 'Favorited' : 'Favorite'}
                </button>

                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-muted hover:text-text"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-muted hover:text-text"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-muted hover:text-text"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}

export default ImageDetailsModal;
