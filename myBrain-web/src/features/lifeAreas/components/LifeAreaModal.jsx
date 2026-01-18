import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useCreateLifeArea, useUpdateLifeArea } from '../hooks/useLifeAreas';
import useToast from '../../../hooks/useToast';

const CATEGORY_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

const CATEGORY_ICONS = [
  { value: 'Folder', label: 'Folder' },
  { value: 'Inbox', label: 'Inbox' },
  { value: 'Briefcase', label: 'Work' },
  { value: 'Heart', label: 'Health' },
  { value: 'DollarSign', label: 'Finance' },
  { value: 'Home', label: 'Home' },
  { value: 'Users', label: 'Family' },
  { value: 'Book', label: 'Learning' },
  { value: 'Target', label: 'Goals' },
];

export function LifeAreaModal({ lifeArea, onClose }) {
  const toast = useToast();
  const createMutation = useCreateLifeArea();
  const updateMutation = useUpdateLifeArea();

  const isEditing = !!lifeArea?._id;

  const [name, setName] = useState(lifeArea?.name || '');
  const [description, setDescription] = useState(lifeArea?.description || '');
  const [color, setColor] = useState(lifeArea?.color || '#6366f1');
  const [icon, setIcon] = useState(lifeArea?.icon || 'Folder');

  useEffect(() => {
    if (lifeArea) {
      setName(lifeArea.name || '');
      setDescription(lifeArea.description || '');
      setColor(lifeArea.color || '#6366f1');
      setIcon(lifeArea.icon || 'Folder');
    }
  }, [lifeArea]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: lifeArea._id, data });
        toast.success('Category updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Category created');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {isEditing ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work & Career, Health & Fitness, Finance"
              maxLength={50}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              maxLength={200}
              rows={2}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Color</label>
            <div className="flex gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIcon(i.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    icon === i.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted hover:border-muted'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {(createMutation.error || updateMutation.error) && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {createMutation.error?.message || updateMutation.error?.message}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Update' : 'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LifeAreaModal;
