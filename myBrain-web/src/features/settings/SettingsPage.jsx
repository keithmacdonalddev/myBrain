import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Settings,
  Tag,
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit3,
  Check,
  X,
  TrendingUp,
  AlertTriangle,
  Merge,
  ChevronDown,
  ChevronUp,
  Folder,
  MapPin,
  Palette,
  Sun,
  Moon,
  Monitor,
  Activity,
  LogIn,
  FileText,
  Shield,
  Calendar
} from 'lucide-react';
import {
  useAllTags,
  useCreateTag,
  useUpdateTag,
  useRenameTag,
  useDeleteTag,
  useMergeTags
} from '../../hooks/useTags';
import useToast from '../../hooks/useToast';
import { LifeAreasManager } from '../lifeAreas/components/LifeAreasManager';
import SavedLocationsManager from '../../components/settings/SavedLocationsManager';
import { setTheme } from '../../store/themeSlice';
import { useUserActivity } from '../profile/hooks/useActivity';

// Color palette for tags
const TAG_COLORS = [
  null, // No color (default)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

// Tag Row Component
function TagRow({ tag, onUpdate, onRename, onDelete, isSelected, onSelect }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== tag.name) {
      onRename(tag.name, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(tag.name);
      setIsEditing(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-bg hover:bg-panel2'
    }`}>
      {/* Select checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(tag.name, e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
      />

      {/* Color indicator */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-6 h-6 rounded-full border-2 border-border hover:border-primary transition-colors flex items-center justify-center"
          style={{ backgroundColor: tag.color || 'var(--panel)' }}
        >
          {!tag.color && <Tag className="w-3 h-3 text-muted" />}
        </button>

        {showColorPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
            <div className="absolute top-full left-0 mt-2 p-2 bg-panel border border-border rounded-xl shadow-lg z-20 flex gap-1.5">
              {TAG_COLORS.map((color, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onUpdate(tag.name, { color });
                    setShowColorPicker(false);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    tag.color === color ? 'border-text' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color || 'var(--bg)' }}
                >
                  {!color && <X className="w-3 h-3 text-muted mx-auto" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tag name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 bg-bg border border-primary rounded text-sm text-text focus:outline-none"
            />
            <button
              onClick={handleRename}
              className="p-1 text-success hover:bg-success/10 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditName(tag.name);
                setIsEditing(false);
              }}
              className="p-1 text-muted hover:bg-bg rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${tag.isActive ? 'text-text' : 'text-muted line-through'}`}>
              {tag.name}
            </span>
            {!tag.isActive && (
              <span className="px-1.5 py-0.5 bg-muted/20 text-muted text-xs rounded">inactive</span>
            )}
          </div>
        )}
      </div>

      {/* Usage count */}
      <div className="flex items-center gap-1 text-sm text-muted">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>{tag.usageCount}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
          title="Rename"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onUpdate(tag.name, { isActive: !tag.isActive })}
          className={`p-1.5 rounded-lg transition-colors ${
            tag.isActive ? 'text-success hover:bg-success/10' : 'text-muted hover:bg-bg'
          }`}
          title={tag.isActive ? 'Deactivate' : 'Activate'}
        >
          {tag.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onDelete(tag.name)}
          className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Tags Management Section
function TagsManagement() {
  const toast = useToast();
  const { data, isLoading } = useAllTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const mergeTags = useMergeTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('usageCount'); // 'usageCount', 'name', 'createdAt'
  const [sortOrder, setSortOrder] = useState('desc');
  const [showInactive, setShowInactive] = useState(true);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // New tag form
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(null);

  // Merge form
  const [mergeTarget, setMergeTarget] = useState('');

  const tags = data?.tags || [];

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    let result = [...tags];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.name.includes(query));
    }

    // Filter by active status
    if (!showInactive) {
      result = result.filter(t => t.isActive);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'usageCount') {
        comparison = a.usageCount - b.usageCount;
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt) - new Date(b.createdAt);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [tags, searchQuery, showInactive, sortBy, sortOrder]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
      toast.success('Tag created');
      setNewTagName('');
      setNewTagColor(null);
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to create tag');
    }
  };

  const handleUpdateTag = async (name, updates) => {
    try {
      await updateTag.mutateAsync({ name, data: updates });
      toast.success('Tag updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update tag');
    }
  };

  const handleRenameTag = async (oldName, newName) => {
    try {
      await renameTag.mutateAsync({ oldName, newName });
      toast.success('Tag renamed');
    } catch (err) {
      toast.error(err.message || 'Failed to rename tag');
    }
  };

  const handleDeleteTag = async (name) => {
    try {
      await deleteTag.mutateAsync(name);
      toast.success('Tag deleted');
      setShowDeleteConfirm(null);
      selectedTags.delete(name);
      setSelectedTags(new Set(selectedTags));
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag');
    }
  };

  const handleMergeTags = async () => {
    if (selectedTags.size < 2) {
      toast.error('Select at least 2 tags to merge');
      return;
    }
    if (!mergeTarget.trim()) {
      toast.error('Enter a target tag name');
      return;
    }

    try {
      await mergeTags.mutateAsync({
        sourceTags: Array.from(selectedTags),
        targetTag: mergeTarget.trim()
      });
      toast.success('Tags merged successfully');
      setSelectedTags(new Set());
      setMergeTarget('');
      setShowMergeModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to merge tags');
    }
  };

  const handleSelectTag = (name, checked) => {
    const newSelected = new Set(selectedTags);
    if (checked) {
      newSelected.add(name);
    } else {
      newSelected.delete(name);
    }
    setSelectedTags(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedTags(new Set(filteredTags.map(t => t.name)));
    } else {
      setSelectedTags(new Set());
    }
  };

  const activeCount = tags.filter(t => t.isActive).length;
  const inactiveCount = tags.filter(t => !t.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Tags</h2>
          <p className="text-sm text-muted">
            {tags.length} total ({activeCount} active, {inactiveCount} inactive)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('-');
            setSortBy(by);
            setSortOrder(order);
          }}
          className="px-3 py-2 bg-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="usageCount-desc">Most Used</option>
          <option value="usageCount-asc">Least Used</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="createdAt-desc">Newest</option>
          <option value="createdAt-asc">Oldest</option>
        </select>

        {/* Show inactive toggle */}
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-border"
          />
          Show inactive
        </label>
      </div>

      {/* Bulk actions */}
      {selectedTags.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-panel border border-border rounded-xl">
          <span className="text-sm text-muted">
            {selectedTags.size} selected
          </span>
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Merge className="w-4 h-4" />
            Merge
          </button>
          <button
            onClick={() => setSelectedTags(new Set())}
            className="text-sm text-muted hover:text-text"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Tags list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted" />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 mx-auto text-muted/50 mb-3" />
          <p className="text-muted">
            {searchQuery ? 'No tags match your search' : 'No tags yet'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Create your first tag
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-3 py-2">
            <input
              type="checkbox"
              checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
            />
            <span className="text-xs text-muted uppercase tracking-wide">Select all</span>
          </div>

          {filteredTags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              onUpdate={handleUpdateTag}
              onRename={handleRenameTag}
              onDelete={(name) => setShowDeleteConfirm(name)}
              isSelected={selectedTags.has(tag.name)}
              onSelect={handleSelectTag}
            />
          ))}
        </div>
      )}

      {/* Create Tag Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel border border-border rounded-2xl shadow-xl z-50 p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Create New Tag</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name..."
                  autoFocus
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Color (optional)</label>
                <div className="flex gap-2">
                  {TAG_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        newTagColor === color ? 'border-text scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color || 'var(--bg)' }}
                    >
                      {!color && <X className="w-4 h-4 text-muted mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={createTag.isPending || !newTagName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {createTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Merge Tags Modal */}
      {showMergeModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMergeModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel border border-border rounded-2xl shadow-xl z-50 p-6">
            <h3 className="text-lg font-semibold text-text mb-4">Merge Tags</h3>

            <p className="text-sm text-muted mb-4">
              Merge {selectedTags.size} selected tags into one. All items with these tags will be updated.
            </p>

            <div className="mb-4 p-3 bg-bg rounded-xl">
              <div className="text-xs text-muted uppercase tracking-wide mb-2">Tags to merge:</div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selectedTags).map(name => (
                  <span key={name} className="px-2 py-1 bg-panel border border-border rounded text-sm text-text">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Target Tag Name
              </label>
              <input
                type="text"
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                placeholder="Enter target tag name..."
                className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted mt-1">
                Can be a new tag name or one of the existing tags
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMergeModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeTags}
                disabled={mergeTags.isPending || !mergeTarget.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {mergeTags.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Merge Tags'}
              </button>
            </div>
          </div>
        </>
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
                <h3 className="font-semibold text-text">Delete Tag?</h3>
                <p className="text-sm text-muted">This will remove it from all items</p>
              </div>
            </div>

            <p className="text-sm text-muted mb-4">
              The tag "<span className="text-text font-medium">{showDeleteConfirm}</span>" will be permanently deleted and removed from all notes and tasks.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTag(showDeleteConfirm)}
                disabled={deleteTag.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {deleteTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Appearance Settings Section
function AppearanceSettings() {
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Appearance</h2>
        <p className="text-sm text-muted">Customize how myBrain looks on your device</p>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = mode === option.value;

            return (
              <button
                key={option.value}
                onClick={() => dispatch(setTheme(option.value))}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-bg'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary/10' : 'bg-bg'
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                </div>
                <div>
                  <div className={`font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {option.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="ml-auto">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-bg rounded-xl border border-border">
        <div className="text-xs text-muted uppercase tracking-wide mb-3">Preview</div>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-panel rounded w-3/4"></div>
            <div className="h-3 bg-panel rounded w-1/2"></div>
            <div className="h-3 bg-panel rounded w-2/3"></div>
          </div>
          <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center">
            {mode === 'dark' ? (
              <Moon className="w-8 h-8 text-primary" />
            ) : (
              <Sun className="w-8 h-8 text-primary" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Settings Section
function ActivitySettings() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useUserActivity({ days, limit: 100 });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'account': return LogIn;
      case 'security': return Shield;
      case 'content': return FileText;
      case 'settings': return Settings;
      default: return Activity;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'account': return 'text-blue-500 bg-blue-500/10';
      case 'security': return 'text-amber-500 bg-amber-500/10';
      case 'content': return 'text-green-500 bg-green-500/10';
      case 'settings': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-muted bg-bg';
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Failed to load activity
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Your Activity</h2>
          <p className="text-sm text-muted">A record of your recent actions in myBrain</p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                days === d
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted'
              }`}
            >
              {d === 7 ? '7 days' : d === 30 ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !data?.timeline?.length ? (
        <div className="text-center py-12 text-muted">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No activity recorded yet</p>
          <p className="text-sm mt-1">Your actions will appear here as you use myBrain</p>
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
          {data.timeline.map((day) => (
            <div key={day.date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted" />
                <span className="text-sm font-medium text-text">{formatDate(day.date)}</span>
                <span className="text-xs text-muted">({day.activities.length} actions)</span>
              </div>

              <div className="border-l-2 border-border pl-4 ml-2 space-y-3">
                {day.activities.map((activity) => {
                  const Icon = getCategoryIcon(activity.category);
                  const colorClass = getCategoryColor(activity.category);

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">{activity.action}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatTime(activity.timestamp)}
                          {!activity.success && (
                            <span className="text-red-500 ml-2">(failed)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.total > 0 && (
        <p className="text-xs text-muted text-center pt-4 border-t border-border">
          Showing {data.total} activities from the last {data.period}
        </p>
      )}
    </div>
  );
}

// Settings Page
function SettingsPage() {
  const [activeSection, setActiveSection] = useState('appearance');

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'life-areas', label: 'Categories', icon: Folder },
    { id: 'locations', label: 'Saved Locations', icon: MapPin },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-text">Settings</h1>
              <p className="text-muted">Manage your preferences and configuration</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-text hover:bg-panel'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-panel border border-border rounded-2xl p-6">
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'life-areas' && <LifeAreasManager />}
            {activeSection === 'locations' && <SavedLocationsManager />}
            {activeSection === 'tags' && <TagsManagement />}
            {activeSection === 'activity' && <ActivitySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
