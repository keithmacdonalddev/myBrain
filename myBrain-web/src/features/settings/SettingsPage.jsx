import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ChevronRight,
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
  Calendar,
  CreditCard,
  StickyNote,
  CheckSquare,
  FolderKanban,
  CalendarDays,
  Image,
  HardDrive,
  Sparkles,
  Crown,
  Infinity,
  LayoutGrid,
  Minimize2
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
import WeatherSettings from '../../components/settings/WeatherSettings';
import WidgetsSettings from '../../components/settings/WidgetsSettings';
import {
  setTheme,
  setAccentColor,
  setReduceMotion,
  setGlassIntensity,
  ACCENT_COLORS,
  GLASS_INTENSITIES,
  selectThemeMode,
  selectAccentColor,
  selectReduceMotion,
  selectGlassIntensity,
} from '../../store/themeSlice';
import api, { authApi } from '../../lib/api';
import { setUser } from '../../store/authSlice';
import { useTooltips } from '../../contexts/TooltipsContext';
import { HelpCircle } from 'lucide-react';

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
            <div className="absolute top-full left-0 mt-2 p-2 bg-panel glass border border-border rounded-xl shadow-theme-floating z-20 flex gap-1.5">
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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl btn-interactive hover:bg-primary-hover"
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl z-50 p-6">
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none"
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl z-50 p-6">
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none"
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl z-50 p-6">
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

// Experimental Features Section
function ExperimentalFeatures() {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(state => state.auth.user);

  // Get current flag value from user (handle Map and object formats)
  const dashboardV2Enabled = user?.flags?.dashboardV2Enabled ||
    (user?.flags instanceof Map ? user.flags.get('dashboardV2Enabled') : false) ||
    false;

  const [isUpdating, setIsUpdating] = useState(false);

  const handleDashboardV2Toggle = async () => {
    try {
      setIsUpdating(true);
      const newValue = !dashboardV2Enabled;
      const response = await api.patch('/profile/flags/dashboard-v2', { enabled: newValue });
      // Update Redux auth state with new user data
      dispatch(setUser(response.data.user));
      toast.success(newValue ? 'New dashboard enabled' : 'Switched to classic dashboard');
    } catch (error) {
      toast.error('Failed to update dashboard preference');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Experimental</h3>
        <p className="text-xs text-muted mb-4">Try new features before they're fully released</p>
      </div>

      <div className="p-4 bg-bg rounded-xl border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-text">New Dashboard (V2)</div>
              <div className="text-xs text-muted mt-0.5">
                Try the redesigned dashboard with new widgets
              </div>
            </div>
          </div>
          <button
            onClick={handleDashboardV2Toggle}
            disabled={isUpdating}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              dashboardV2Enabled ? 'bg-primary' : 'bg-border'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                dashboardV2Enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Appearance Settings Section
function AppearanceSettings() {
  const dispatch = useDispatch();
  const mode = useSelector(selectThemeMode);
  const accentColor = useSelector(selectAccentColor);
  const reduceMotion = useSelector(selectReduceMotion);
  const glassIntensity = useSelector(selectGlassIntensity);
  const { tooltipsEnabled, setTooltipsEnabled, isUpdating } = useTooltips();

  // Theme options with icons
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Appearance</h2>
        <p className="text-sm text-muted">Customize how myBrain looks</p>
      </div>

      {/* Theme Selection */}
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = mode === option.value;

            return (
              <button
                key={option.value}
                onClick={() => dispatch(setTheme(option.value))}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-bg'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary/15' : 'bg-bg'
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color Selection */}
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Accent Color</h3>
        <div className="flex gap-3">
          {ACCENT_COLORS.map((color) => {
            const isSelected = accentColor === color.id;

            return (
              <button
                key={color.id}
                onClick={() => dispatch(setAccentColor(color.id))}
                className="relative group"
                title={color.label}
              >
                <div
                  className={`w-8 h-8 rounded-full transition-transform group-hover:scale-110 ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-bg ring-text' : ''
                  }`}
                  style={{ backgroundColor: color.lightColor }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Glass Intensity (IN-PROGRESS: revisit after usage) */}
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Glass Intensity</h3>
        <div className="grid grid-cols-3 gap-3">
          {GLASS_INTENSITIES.map((level) => {
            const isSelected = glassIntensity === level.id;

            return (
              <button
                key={level.id}
                onClick={() => dispatch(setGlassIntensity(level.id))}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-bg'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-primary/15' : 'bg-bg'
                }`}>
                  <Sparkles className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text'}`}>
                  {level.label}
                </span>
                <span className="text-[11px] text-muted">
                  {level.id === 'low' ? 'Subtle' : level.id === 'high' ? 'Bold' : 'Balanced'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Accessibility Section */}
      <div>
        <h3 className="text-sm font-medium text-text mb-3">Accessibility</h3>
        <div className="space-y-3">
          {/* Reduce Motion Toggle */}
          <div className="p-4 bg-bg rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Minimize2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text">Reduce motion</div>
                  <div className="text-xs text-muted mt-0.5">
                    Minimize animations throughout the app
                  </div>
                </div>
              </div>
              <button
                onClick={() => dispatch(setReduceMotion(!reduceMotion))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  reduceMotion ? 'bg-primary' : 'bg-border'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    reduceMotion ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Show Tooltips Toggle */}
          <div className="p-4 bg-bg rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-text">Show tooltips</div>
                  <div className="text-xs text-muted mt-0.5">
                    Display hints when hovering over elements
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTooltipsEnabled(!tooltipsEnabled)}
                disabled={isUpdating}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  tooltipsEnabled ? 'bg-primary' : 'bg-border'
                } ${isUpdating ? 'opacity-50' : ''}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    tooltipsEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Experimental Features Section */}
      <ExperimentalFeatures />
    </div>
  );
}

// Activity Settings Section
// Simplified summary card that links to the full Activity page
function ActivitySettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text">Activity & Security</h2>
        <p className="text-sm text-muted">
          View your login history, manage active sessions, and monitor security alerts
        </p>
      </div>

      {/* Link card to full activity page */}
      <Link
        to="/app/settings/activity"
        className="flex items-center justify-between p-4 bg-bg rounded-lg border border-border hover:border-primary/50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text">View Full Activity</p>
            <p className="text-sm text-muted">
              Sessions, login history, security alerts, and more
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
      </Link>

      {/* Quick info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-bg rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-text">Sessions</span>
          </div>
          <p className="text-xs text-muted">
            Manage devices signed into your account
          </p>
        </div>
        <div className="p-4 bg-bg rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-text">Security</span>
          </div>
          <p className="text-xs text-muted">
            Monitor alerts and suspicious activity
          </p>
        </div>
      </div>
    </div>
  );
}

// Subscription & Usage Section
function SubscriptionUsage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await authApi.getSubscription();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const formatBytes = (bytes) => {
    if (bytes === -1) return 'Unlimited';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatLimit = (value) => {
    if (value === -1) return 'Unlimited';
    return value.toLocaleString();
  };

  const getUsagePercent = (used, limit) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-amber-500';
    return 'bg-primary';
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      case 'premium': return Crown;
      default: return Sparkles;
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'premium': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      default: return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  const limitItems = [
    { key: 'maxNotes', label: 'Notes', icon: StickyNote, usageKey: 'notes' },
    { key: 'maxTasks', label: 'Tasks', icon: CheckSquare, usageKey: 'tasks' },
    { key: 'maxProjects', label: 'Projects', icon: FolderKanban, usageKey: 'projects' },
    { key: 'maxEvents', label: 'Events', icon: CalendarDays, usageKey: 'events' },
    { key: 'maxImages', label: 'Images', icon: Image, usageKey: 'images' },
    { key: 'maxCategories', label: 'Categories', icon: Folder, usageKey: 'categories' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Failed to load subscription info
      </div>
    );
  }

  const RoleIcon = getRoleIcon(data?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Subscription & Usage</h2>
        <p className="text-sm text-muted">View your current plan and resource usage</p>
      </div>

      {/* Current Plan Card */}
      <div className="p-5 bg-bg rounded-xl border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              data?.role === 'admin' ? 'bg-purple-500/10' :
              data?.role === 'premium' ? 'bg-amber-500/10' : 'bg-primary/10'
            }`}>
              <RoleIcon className={`w-6 h-6 ${
                data?.role === 'admin' ? 'text-purple-500' :
                data?.role === 'premium' ? 'text-amber-500' : 'text-primary'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text">{data?.roleLabel} Plan</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeStyle(data?.role)}`}>
                  {data?.role?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted mt-0.5">
                {data?.role === 'admin' ? 'Full access to all features and unlimited resources' :
                 data?.role === 'premium' ? 'Unlimited access to all features' :
                 'Basic access with resource limits'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div>
        <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted" />
          Resource Usage
        </h3>

        <div className="space-y-4">
          {limitItems.map((item) => {
            const Icon = item.icon;
            const limit = data?.limits?.[item.key] ?? 0;
            const used = data?.usage?.[item.usageKey] ?? 0;
            const percent = getUsagePercent(used, limit);
            const isUnlimited = limit === -1;

            return (
              <div key={item.key} className="p-4 bg-bg rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted" />
                    <span className="text-sm font-medium text-text">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text font-medium">{used.toLocaleString()}</span>
                    <span className="text-sm text-muted">/</span>
                    {isUnlimited ? (
                      <span className="flex items-center gap-1 text-sm text-muted">
                        <Infinity className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-sm text-muted">{formatLimit(limit)}</span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-panel rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isUnlimited ? 'bg-green-500' : getUsageColor(percent)}`}
                    style={{ width: isUnlimited ? '5%' : `${Math.max(2, percent)}%` }}
                  />
                </div>
                {!isUnlimited && percent >= 75 && (
                  <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {percent >= 90 ? 'Almost at limit' : 'Approaching limit'}
                  </p>
                )}
              </div>
            );
          })}

          {/* Storage */}
          {data?.limits?.maxStorageBytes !== undefined && (
            <div className="p-4 bg-bg rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted" />
                  <span className="text-sm font-medium text-text">Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text font-medium">{formatBytes(data?.usage?.storageBytes ?? 0)}</span>
                  <span className="text-sm text-muted">/</span>
                  <span className="text-sm text-muted">{formatBytes(data?.limits?.maxStorageBytes)}</span>
                </div>
              </div>
              <div className="h-2 bg-panel rounded-full overflow-hidden">
                {(() => {
                  const storagePercent = getUsagePercent(data?.usage?.storageBytes ?? 0, data?.limits?.maxStorageBytes);
                  const isUnlimited = data?.limits?.maxStorageBytes === -1;
                  return (
                    <div
                      className={`h-full rounded-full transition-all ${isUnlimited ? 'bg-green-500' : getUsageColor(storagePercent)}`}
                      style={{ width: isUnlimited ? '5%' : `${Math.max(2, storagePercent)}%` }}
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Note */}
      {data?.role === 'free' && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-text">Need more resources?</h4>
              <p className="text-xs text-muted mt-1">
                Upgrade to Premium for unlimited notes, tasks, projects, and more.
                Contact your administrator to upgrade your account.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Page
function SettingsPage({ onMobileClose }) {
  const [activeSection, setActiveSection] = useState('subscription');
  const [mobileSection, setMobileSection] = useState(null); // null = show menu, string = show section

  const sections = [
    { id: 'subscription', label: 'Subscription', description: 'Plan, usage & limits', icon: CreditCard },
    { id: 'appearance', label: 'Appearance', description: 'Theme & display options', icon: Palette },
    { id: 'widgets', label: 'Widgets', description: 'Dashboard widgets', icon: LayoutGrid },
    { id: 'weather', label: 'Weather', description: 'Locations & units', icon: Sun },
    { id: 'life-areas', label: 'Categories', description: 'Organize by life areas', icon: Folder },
    { id: 'locations', label: 'Locations', description: 'Saved places', icon: MapPin },
    { id: 'tags', label: 'Tags', description: 'Manage your tags', icon: Tag },
    { id: 'activity', label: 'Activity', description: 'Sessions & security', icon: Activity },
  ];

  const activeMobileSection = sections.find(s => s.id === mobileSection);

  // Render content based on section ID
  const renderContent = (sectionId) => {
    switch (sectionId) {
      case 'subscription': return <SubscriptionUsage />;
      case 'appearance': return <AppearanceSettings />;
      case 'widgets': return <WidgetsSettings />;
      case 'weather': return <WeatherSettings />;
      case 'life-areas': return <LifeAreasManager />;
      case 'locations': return <SavedLocationsManager />;
      case 'tags': return <TagsManagement />;
      case 'activity': return <ActivitySettings />;
      default: return null;
    }
  };

  return (
    <div className="bg-bg h-full">
      {/* Mobile View */}
      <div className="sm:hidden h-full flex flex-col relative overflow-hidden">
        {/* Mobile Menu View */}
        <div
          className={`h-full flex flex-col transition-transform duration-300 ease-in-out ${
            mobileSection ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Header with close button */}
          <div className="flex-shrink-0 flex items-center justify-between h-14 px-4">
            <button
              onClick={onMobileClose}
              className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-text">Settings</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-auto">
            <div className="pt-4">
              <div className="mx-4 bg-panel rounded-xl overflow-hidden">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.id} className="relative">
                      <button
                        onClick={() => setMobileSection(section.id)}
                        className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-left active:bg-bg/50 transition-colors min-h-[48px]"
                      >
                        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="flex-1 text-[15px] text-text">{section.label}</span>
                        <ArrowLeft className="w-4 h-4 text-muted/40 rotate-180" />
                      </button>
                      {index < sections.length - 1 && (
                        <div className="absolute bottom-0 left-[52px] right-0 h-px bg-border/60" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Section Content - slides in from right */}
        <div
          className={`absolute inset-0 h-full bg-bg flex flex-col transition-transform duration-300 ease-in-out ${
            mobileSection ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Section Header with back button */}
          <div className="flex-shrink-0 flex items-center h-14 px-4">
            <button
              onClick={() => setMobileSection(null)}
              className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-text ml-2">{activeMobileSection?.label}</h1>
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-auto p-4">
            {mobileSection && renderContent(mobileSection)}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:flex h-full">
        {/* Settings Navigation - Left Panel */}
        <div className="w-56 border-r border-border flex-shrink-0 p-4">
          <div className="flex items-center gap-2 mb-4 px-2">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text">Settings</h1>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-text hover:bg-bg'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div className={activeSection === section.id ? 'font-medium' : ''}>{section.label}</div>
                    <div className="text-xs text-muted">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            {renderContent(activeSection)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
