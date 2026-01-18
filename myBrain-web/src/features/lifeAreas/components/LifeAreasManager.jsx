import { useState } from 'react';
import {
  Folder,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  Star,
  Archive,
  ArchiveRestore,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import {
  useLifeAreas,
  useCreateLifeArea,
  useUpdateLifeArea,
  useDeleteLifeArea,
  useSetDefaultLifeArea,
  useReorderLifeAreas,
  useArchiveLifeArea
} from '../hooks/useLifeAreas';
import { LifeAreaModal } from './LifeAreaModal';
import useToast from '../../../hooks/useToast';

// Life Area Row Component
function LifeAreaRow({ lifeArea, onEdit, onDelete, onSetDefault, onArchive, isDragging }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isDragging ? 'bg-primary/10 border border-primary/30' : 'bg-bg hover:bg-panel2'
      } ${lifeArea.isArchived ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      {!lifeArea.isArchived && (
        <div className="cursor-grab text-muted hover:text-text">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Color indicator */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: lifeArea.color }}
      />

      {/* Name and description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${lifeArea.isArchived ? 'text-muted' : 'text-text'}`}>
            {lifeArea.name}
          </span>
          {lifeArea.isDefault && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
              <Star className="w-3 h-3" />
              Default
            </span>
          )}
          {lifeArea.isArchived && (
            <span className="px-1.5 py-0.5 bg-muted/20 text-muted text-xs rounded">archived</span>
          )}
        </div>
        {lifeArea.description && (
          <p className="text-xs text-muted truncate">{lifeArea.description}</p>
        )}
      </div>

      {/* Item counts */}
      {lifeArea.itemCounts && (
        <div className="text-xs text-muted">
          {lifeArea.itemCounts.notes + lifeArea.itemCounts.tasks + lifeArea.itemCounts.events} items
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {!lifeArea.isArchived && !lifeArea.isDefault && (
          <button
            onClick={() => onSetDefault(lifeArea._id)}
            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Set as default"
          >
            <Star className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onEdit(lifeArea)}
          className="p-1.5 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onArchive(lifeArea._id, !lifeArea.isArchived)}
          className={`p-1.5 rounded-lg transition-colors ${
            lifeArea.isArchived
              ? 'text-success hover:bg-success/10'
              : 'text-muted hover:text-warning hover:bg-warning/10'
          }`}
          title={lifeArea.isArchived ? 'Restore' : 'Archive'}
        >
          {lifeArea.isArchived ? (
            <ArchiveRestore className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
        </button>
        {!lifeArea.isDefault && (
          <button
            onClick={() => onDelete(lifeArea)}
            className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Life Areas Manager Component
export function LifeAreasManager() {
  const toast = useToast();
  const { data: lifeAreas = [], isLoading } = useLifeAreas();
  const createMutation = useCreateLifeArea();
  const updateMutation = useUpdateLifeArea();
  const deleteMutation = useDeleteLifeArea();
  const setDefaultMutation = useSetDefaultLifeArea();
  const reorderMutation = useReorderLifeAreas();
  const archiveMutation = useArchiveLifeArea();

  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Separate active and archived areas
  const activeAreas = lifeAreas.filter(la => !la.isArchived);
  const archivedAreas = lifeAreas.filter(la => la.isArchived);

  const handleEdit = (lifeArea) => {
    setEditingArea(lifeArea);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingArea(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingArea(null);
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultMutation.mutateAsync(id);
      toast.success('Default category updated');
    } catch (err) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  const handleArchive = async (id, archive) => {
    try {
      await archiveMutation.mutateAsync({ id, archive });
      toast.success(archive ? 'Category archived' : 'Category restored');
    } catch (err) {
      toast.error(err.message || 'Failed to archive');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(showDeleteConfirm._id);
      toast.success('Category deleted');
      setShowDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Categories</h2>
          <p className="text-sm text-muted">
            Organize your work into meaningful areas of responsibility. Categories help you maintain focus on what matters most in different aspects of your life.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Active Areas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      ) : activeAreas.length === 0 ? (
        <div className="text-center py-12 max-w-md mx-auto">
          <Folder className="w-12 h-12 mx-auto text-muted/50 mb-3" />
          <h3 className="text-lg font-medium text-text mb-2">No categories yet</h3>
          <div className="text-sm text-muted mb-4 space-y-2">
            <p>
              <strong className="text-text">Categories</strong> help you organize your work into
              meaningful areas of responsibility that persist over time, unlike projects which have a clear end.
            </p>
            <p className="text-xs">
              Examples: "Work & Career", "Health & Fitness", "Finance", "Family & Relationships", "Personal Growth"
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAreas.map((lifeArea) => (
            <LifeAreaRow
              key={lifeArea._id}
              lifeArea={lifeArea}
              onEdit={handleEdit}
              onDelete={setShowDeleteConfirm}
              onSetDefault={handleSetDefault}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {/* Archived Areas */}
      {archivedAreas.length > 0 && (
        <div className="pt-4 border-t border-border">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Hide' : 'Show'} archived ({archivedAreas.length})
          </button>

          {showArchived && (
            <div className="mt-4 space-y-2">
              {archivedAreas.map((lifeArea) => (
                <LifeAreaRow
                  key={lifeArea._id}
                  lifeArea={lifeArea}
                  onEdit={handleEdit}
                  onDelete={setShowDeleteConfirm}
                  onSetDefault={handleSetDefault}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <LifeAreaModal
          lifeArea={editingArea}
          onClose={handleCloseModal}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel border border-border rounded-2xl shadow-xl z-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Delete Category?</h3>
                <p className="text-sm text-muted">Items will be moved to default</p>
              </div>
            </div>

            <p className="text-sm text-muted mb-4">
              The category "<span className="text-text font-medium">{showDeleteConfirm.name}</span>" will be
              permanently deleted. All associated items will be moved to your default category.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LifeAreasManager;
