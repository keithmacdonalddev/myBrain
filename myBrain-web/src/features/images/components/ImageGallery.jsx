import { useState } from 'react';
import { Trash2, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDeleteImage } from '../hooks/useImages';
import useToast from '../../../hooks/useToast';

function ImageGallery({ images = [], isLoading }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const deleteMutation = useDeleteImage();
  const toast = useToast();

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  const openLightbox = (index) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDelete = async (image, e) => {
    e?.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setDeletingId(image._id);
    try {
      await deleteMutation.mutateAsync(image._id);
      toast.success('Image deleted');
      if (selectedIndex !== null) {
        closeLightbox();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (selectedIndex === null) return;

    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-border rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">No images yet. Upload your first image above.</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <div
            key={image._id}
            className="group relative aspect-square rounded-lg overflow-hidden bg-bg border border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => openLightbox(index)}
          >
            <img
              src={image.secureUrl}
              alt={image.alt || image.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Overlay with delete button */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
              <button
                onClick={(e) => handleDelete(image, e)}
                disabled={deletingId === image._id}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
              >
                {deletingId === image._id ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={selectedImage.secureUrl}
            alt={selectedImage.alt || selectedImage.originalName}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Image info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-lg text-white text-sm">
            <p className="font-medium">{selectedImage.originalName}</p>
            <p className="text-white/70">
              {selectedImage.width} x {selectedImage.height} &bull; {Math.round(selectedImage.size / 1024)}KB
            </p>
          </div>

          {/* Delete button in lightbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(selectedImage);
            }}
            disabled={deletingId === selectedImage._id}
            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-red-500 rounded-full transition-colors"
          >
            {deletingId === selectedImage._id ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      )}
    </>
  );
}

export default ImageGallery;
