import { useState, useCallback } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useUploadFile } from '../hooks/useFiles';
import { formatBytes } from '../utils/formatters';
import useToast from '../../../hooks/useToast';

export default function FileUpload({ folderId, onUploadComplete }) {
  const toast = useToast();
  const uploadFile = useUploadFile();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);

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

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = '';
  };

  const handleFiles = (files) => {
    const newUploads = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
      error: null,
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Upload each file
    newUploads.forEach(upload => {
      uploadSingleFile(upload);
    });
  };

  const uploadSingleFile = async (upload) => {
    setUploads(prev =>
      prev.map(u => u.id === upload.id ? { ...u, status: 'uploading' } : u)
    );

    try {
      await uploadFile.mutateAsync({
        file: upload.file,
        options: {
          folderId,
          onProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploads(prev =>
              prev.map(u => u.id === upload.id ? { ...u, progress } : u)
            );
          },
        },
      });

      setUploads(prev =>
        prev.map(u => u.id === upload.id ? { ...u, status: 'complete', progress: 100 } : u)
      );

      // Check if all uploads are complete
      setTimeout(() => {
        setUploads(prev => {
          const allComplete = prev.every(u => u.status === 'complete' || u.status === 'error');
          if (allComplete && prev.length > 0) {
            const successCount = prev.filter(u => u.status === 'complete').length;
            if (successCount > 0) {
              toast.success(`Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
            }
            onUploadComplete?.();
            return [];
          }
          return prev;
        });
      }, 500);

    } catch (error) {
      setUploads(prev =>
        prev.map(u => u.id === upload.id ? { ...u, status: 'error', error: error.message } : u)
      );
      toast.error(`Failed to upload ${upload.name}: ${error.message}`);
    }
  };

  const removeUpload = (id) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted'}`} />
        <p className="text-sm text-text mb-1">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted">
          Upload any file type (max 100MB per file)
        </p>
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <div
              key={upload.id}
              className="flex items-center gap-3 p-3 bg-panel border border-border rounded-lg"
            >
              <File className="w-5 h-5 text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">{upload.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted">{formatBytes(upload.size)}</p>
                  {upload.status === 'uploading' && (
                    <p className="text-xs text-primary">{upload.progress}%</p>
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-red-500">{upload.error}</p>
                  )}
                </div>
                {upload.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {upload.status === 'pending' && (
                  <Loader2 className="w-5 h-5 text-muted animate-spin" />
                )}
                {upload.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {upload.status === 'complete' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <button
                    onClick={() => removeUpload(upload.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
