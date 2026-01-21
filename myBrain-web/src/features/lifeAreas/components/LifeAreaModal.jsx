import { useState, useEffect } from 'react';
import { useCreateLifeArea, useUpdateLifeArea } from '../hooks/useLifeAreas';
import useToast from '../../../hooks/useToast';
import BaseModal from '../../../components/ui/BaseModal';

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
  const error = createMutation.error?.message || updateMutation.error?.message;

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'New Category'}
      size="md"
      onSubmit={handleSubmit}
      submitText={isEditing ? 'Update' : 'Create'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
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
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default LifeAreaModal;
