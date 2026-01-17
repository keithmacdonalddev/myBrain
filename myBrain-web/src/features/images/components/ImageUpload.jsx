import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { useUploadImage } from '../hooks/useImages';
import useToast from '../../../hooks/useToast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function ImageUpload({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const uploadMutation = useUploadImage();

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.';
    }
    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size is 5MB.';
    }
    return null;
  };

  const handleFile = useCallback(async (file) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      await uploadMutation.mutateAsync({ file, options: {} });
      toast.success('Image uploaded successfully');
      setPreview(null);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setError(err.message || 'Failed to upload image');
      setPreview(null);
    }
  }, [uploadMutation, toast, onUploadComplete]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const cancelPreview = () => {
    setPreview(null);
    setError(null);
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-panel">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-48 object-contain bg-bg"
          />
          {isUploading ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          ) : (
            <button
              onClick={cancelPreview}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-bg'
            }
          `}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted'}`} />
          <p className="text-text font-medium mb-1">
            {isDragging ? 'Drop image here' : 'Click or drag to upload'}
          </p>
          <p className="text-sm text-muted">
            JPG, PNG, GIF, or WebP (max 5MB)
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
