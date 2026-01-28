import { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Star,
  Home,
  Briefcase,
  Loader2,
  Check,
  GripVertical
} from 'lucide-react';
import {
  useSavedLocations,
  useCreateSavedLocation,
  useUpdateSavedLocation,
  useDeleteSavedLocation,
  useSetDefaultLocation
} from '../../hooks/useSavedLocations';
import useToast from '../../hooks/useToast';
import LocationPicker from '../ui/LocationPicker';

// Category icons and labels
const CATEGORIES = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'other', label: 'Other', icon: MapPin }
];

// Location Row Component
function LocationRow({ location, onUpdate, onDelete, onSetDefault }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(location.name);
  const [editAddress, setEditAddress] = useState(location.address);
  const [editCategory, setEditCategory] = useState(location.category);

  const CategoryIcon = CATEGORIES.find(c => c.value === location.category)?.icon || MapPin;

  const handleSave = () => {
    if (editName.trim() && editAddress.trim()) {
      onUpdate(location._id, {
        name: editName.trim(),
        address: editAddress.trim(),
        category: editCategory
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(location.name);
    setEditAddress(location.address);
    setEditCategory(location.category);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-bg border border-border rounded-xl space-y-3">
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g., Home, Office, Gym"
            autoFocus
            className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Address</label>
          <LocationPicker
            value={editAddress}
            onChange={setEditAddress}
            placeholder="Search for an address..."
            autoSave={false}
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Category</label>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setEditCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    editCategory === cat.value
                      ? 'bg-primary text-white'
                      : 'bg-panel border border-border text-text hover:bg-bg'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editName.trim() || !editAddress.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-bg hover:bg-panel rounded-xl transition-colors group">
      {/* Drag handle (future) */}
      <div className="mt-1 text-muted/30 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Category icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        location.category === 'home' ? 'bg-blue-500/10 text-blue-500' :
        location.category === 'work' ? 'bg-amber-500/10 text-amber-500' :
        'bg-primary/10 text-primary'
      }`}>
        <CategoryIcon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text truncate">{location.name}</span>
          {location.isDefault && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 text-xs rounded">
              <Star className="w-3 h-3" />
              Default
            </span>
          )}
        </div>
        <p className="text-sm text-muted truncate mt-0.5">{location.address}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!location.isDefault && (
          <button
            onClick={() => onSetDefault(location._id)}
            className="p-1.5 text-muted hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
            title="Set as default"
          >
            <Star className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(location._id)}
          className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Create Location Form
function CreateLocationForm({ onClose }) {
  const toast = useToast();
  const createLocation = useCreateSavedLocation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('other');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name for this location');
      return;
    }

    if (!address.trim()) {
      toast.error('Please select an address');
      return;
    }

    try {
      await createLocation.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        category
      });
      toast.success('Location saved');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save location');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
      <h4 className="font-medium text-text">Add New Location</h4>

      <div>
        <label className="block text-xs text-muted mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Home, Office, Gym"
          autoFocus
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Address *</label>
        <LocationPicker
          value={address}
          onChange={setAddress}
          placeholder="Search for an address..."
          autoSave={false}
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Category</label>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  category === cat.value
                    ? 'bg-primary text-white'
                    : 'bg-panel border border-border text-text hover:bg-bg'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-muted hover:text-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createLocation.isPending || !name.trim() || !address.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {createLocation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Save Location
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Main Manager Component
function SavedLocationsManager() {
  const toast = useToast();
  const { data: locations, isLoading } = useSavedLocations();
  const updateLocation = useUpdateSavedLocation();
  const deleteLocation = useDeleteSavedLocation();
  const setDefaultLocation = useSetDefaultLocation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleUpdate = async (id, data) => {
    try {
      await updateLocation.mutateAsync({ id, data });
      toast.success('Location updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update location');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLocation.mutateAsync(id);
      toast.success('Location deleted');
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete location');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultLocation.mutateAsync(id);
      toast.success('Default location updated');
    } catch (err) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Saved Locations</h2>
          <p className="text-sm text-muted">
            Save frequently used addresses for quick access
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateLocationForm onClose={() => setShowCreateForm(false)} />
      )}

      {/* Locations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      ) : !locations || locations.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 mx-auto text-muted/50 mb-3" />
          <p className="text-muted mb-2">No saved locations yet</p>
          <p className="text-sm text-muted/70">
            Add your home, work, or other frequently used addresses for quick access when creating events and tasks.
          </p>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Add your first location
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => (
            <LocationRow
              key={location._id}
              location={location}
              onUpdate={handleUpdate}
              onDelete={(id) => setDeleteConfirm(id)}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl z-50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Delete Location?</h3>
                <p className="text-sm text-muted">This cannot be undone</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLocation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {deleteLocation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SavedLocationsManager;
