import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  GripVertical,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Clock,
  ChevronUp,
  ChevronDown,
  StickyNote,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Folder,
  Star,
  Zap,
  Settings,
  Users,
  Calendar,
  Heart,
  Coffee,
  Music,
  Camera,
  Map,
  ShoppingCart,
  Briefcase
} from 'lucide-react';
import { areasApi } from '../../lib/api';

// Icon mapping for area icons
const ICON_MAP = {
  StickyNote,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Folder,
  Star,
  Zap,
  Settings,
  Users,
  Calendar,
  Heart,
  Coffee,
  Music,
  Camera,
  Map,
  ShoppingCart,
  Briefcase
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

function getStatusBadge(status) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">
          <Check className="w-3 h-3" />
          Active
        </span>
      );
    case 'coming_soon':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
          <Clock className="w-3 h-3" />
          Coming Soon
        </span>
      );
    case 'hidden':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-500">
          <EyeOff className="w-3 h-3" />
          Hidden
        </span>
      );
    default:
      return null;
  }
}

function AreaRow({ area, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const IconComponent = ICON_MAP[area.icon] || Folder;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-bg rounded-lg transition-colors border-b border-border last:border-0">
      {/* Drag handle / Reorder buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onMoveUp(area)}
          disabled={isFirst}
          className="p-1 hover:bg-panel rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4 text-muted" />
        </button>
        <button
          onClick={() => onMoveDown(area)}
          disabled={isLast}
          className="p-1 hover:bg-panel rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${area.color || '#6366f1'}20` }}
      >
        <IconComponent className="w-5 h-5" style={{ color: area.color || '#6366f1' }} />
      </div>

      {/* Area info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text">{area.name}</span>
          {getStatusBadge(area.status)}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted font-mono">/{area.slug}</span>
          {area.description && (
            <span className="text-xs text-muted truncate">{area.description}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(area)}
          className="p-2 hover:bg-panel rounded-lg transition-colors"
          title="Edit area"
        >
          <Edit2 className="w-4 h-4 text-muted" />
        </button>
        <button
          onClick={() => onDelete(area)}
          className="p-2 hover:bg-panel rounded-lg transition-colors text-red-500"
          title="Delete area"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AreaModal({ area, onClose, onSave }) {
  const isEditing = !!area?._id;
  const [formData, setFormData] = useState({
    name: area?.name || '',
    slug: area?.slug || '',
    icon: area?.icon || 'Folder',
    status: area?.status || 'coming_soon',
    description: area?.description || '',
    color: area?.color || '#6366f1'
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (name) => {
    const updates = { name };
    // Auto-generate slug from name if not editing
    if (!isEditing && !formData.slug) {
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Slug is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const IconComponent = ICON_MAP[formData.icon] || Folder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel border border-border rounded-lg shadow-xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {isEditing ? 'Edit Area' : 'Add New Area'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Fitness, Recipes"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Slug (URL path)</label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-bg border border-r-0 border-border rounded-l-lg text-sm text-muted">/app/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="fitness"
                disabled={isEditing}
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-r-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this area"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['active', 'coming_soon', 'hidden'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status }))}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    formData.status === status
                      ? status === 'active'
                        ? 'border-green-500 bg-green-500/10 text-green-500'
                        : status === 'coming_soon'
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                        : 'border-gray-500 bg-gray-500/10 text-gray-500'
                      : 'border-border hover:bg-bg text-muted'
                  }`}
                >
                  {status === 'active' && <Eye className="w-4 h-4 mx-auto mb-1" />}
                  {status === 'coming_soon' && <Clock className="w-4 h-4 mx-auto mb-1" />}
                  {status === 'hidden' && <EyeOff className="w-4 h-4 mx-auto mb-1" />}
                  <span className="block text-xs">
                    {status === 'coming_soon' ? 'Coming Soon' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Icon</label>
              <div className="grid grid-cols-5 gap-1 p-2 bg-bg border border-border rounded-lg max-h-32 overflow-auto">
                {AVAILABLE_ICONS.map((iconName) => {
                  const Icon = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                      className={`p-2 rounded transition-colors ${
                        formData.icon === iconName
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-panel text-muted'
                      }`}
                      title={iconName}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <IconComponent className="w-5 h-5" style={{ color: formData.color }} />
                </div>
                <span className="text-sm text-muted font-mono">{formData.color}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Create Area'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ area, onClose, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-panel border border-border rounded-lg shadow-xl">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Delete Area</h3>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to delete <span className="text-text font-medium">{area.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminAreasPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [deletingArea, setDeletingArea] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-areas'],
    queryFn: async () => {
      const response = await areasApi.getAllAreas();
      return response.data.areas;
    }
  });

  const createArea = useMutation({
    mutationFn: (areaData) => areasApi.createArea(areaData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setShowModal(false);
    }
  });

  const updateArea = useMutation({
    mutationFn: ({ slug, data }) => areasApi.updateArea(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setEditingArea(null);
    }
  });

  const deleteArea = useMutation({
    mutationFn: (slug) => areasApi.deleteArea(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setDeletingArea(null);
    }
  });

  const reorderAreas = useMutation({
    mutationFn: (orderedSlugs) => areasApi.reorderAreas(orderedSlugs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-areas'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    }
  });

  const handleSave = async (formData) => {
    if (editingArea) {
      await updateArea.mutateAsync({ slug: editingArea.slug, data: formData });
    } else {
      await createArea.mutateAsync(formData);
    }
  };

  const handleMoveUp = (area) => {
    if (!data) return;
    const index = data.findIndex(a => a._id === area._id);
    if (index <= 0) return;

    const newOrder = [...data];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderAreas.mutate(newOrder.map(a => a.slug));
  };

  const handleMoveDown = (area) => {
    if (!data) return;
    const index = data.findIndex(a => a._id === area._id);
    if (index === -1 || index >= data.length - 1) return;

    const newOrder = [...data];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderAreas.mutate(newOrder.map(a => a.slug));
  };

  const handleDelete = async () => {
    if (!deletingArea) return;
    await deleteArea.mutateAsync(deletingArea.slug);
  };

  const sortedAreas = data?.slice().sort((a, b) => a.order - b.order) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text">Areas Management</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Area
            </button>
          </div>
        </div>

        <p className="text-sm text-muted">
          Manage the areas shown in the sidebar. Areas can be active, coming soon, or hidden.
        </p>
      </div>

      {/* Areas list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-bg rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">Failed to load areas</p>
            <p className="text-sm text-muted mt-1">{error.message}</p>
          </div>
        ) : sortedAreas.length === 0 ? (
          <div className="p-8 text-center">
            <Folder className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-muted">No areas found</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Create your first area
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="bg-panel border border-border rounded-lg">
              {sortedAreas.map((area, index) => (
                <AreaRow
                  key={area._id}
                  area={area}
                  onEdit={setEditingArea}
                  onDelete={setDeletingArea}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={index === 0}
                  isLast={index === sortedAreas.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <AreaModal
          area={null}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
      {editingArea && (
        <AreaModal
          area={editingArea}
          onClose={() => setEditingArea(null)}
          onSave={handleSave}
        />
      )}
      {deletingArea && (
        <DeleteConfirmModal
          area={deletingArea}
          onClose={() => setDeletingArea(null)}
          onConfirm={handleDelete}
          isDeleting={deleteArea.isPending}
        />
      )}
    </div>
  );
}

export default AdminAreasPage;
