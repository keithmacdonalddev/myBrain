import { useState } from 'react';
import { X, Folder, Loader2 } from 'lucide-react';
import { useCreateFolder } from '../hooks/useFolders';
import useToast from '../../../hooks/useToast';

// Preset colors for folders
const FOLDER_COLORS = [
  { name: 'Default', value: null },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
];

export default function CreateFolderModal({ isOpen, onClose, parentId = null, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(null);
  const createFolder = useCreateFolder();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentId,
        color,
      });
      toast.success('Folder created');
      onCreated?.();
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const handleClose = () => {
    setName('');
    setColor(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-panel border border-border rounded-xl shadow-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">New Folder</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Folder preview */}
            <div className="flex justify-center py-4">
              <Folder
                className="w-16 h-16 transition-colors"
                style={{ color: color || '#6B7280' }}
              />
            </div>

            {/* Name input */}
            <div>
              <label className="block text-sm text-muted mb-1">Folder Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name..."
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm text-muted mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === c.value
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: c.value || '#6B7280',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Parent folder info */}
            {parentId && (
              <p className="text-xs text-muted">
                This folder will be created inside the selected folder.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createFolder.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createFolder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Folder'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
