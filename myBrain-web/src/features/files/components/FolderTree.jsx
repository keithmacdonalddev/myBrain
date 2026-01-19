import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  FolderPlus,
  Home,
  Star,
  Clock,
  Archive as ArchiveIcon,
} from 'lucide-react';

// Folder tree item component
function FolderTreeItem({
  folder,
  level = 0,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateSubfolder,
  onRename,
  onDelete
}) {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder._id);
  const isSelected = selectedId === folder._id;

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(folder._id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(folder._id);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'text-text hover:bg-bg'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleToggle}
          className={`p-0.5 rounded hover:bg-bg/50 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
        )}

        {/* Folder name */}
        <span className="flex-1 text-sm truncate">{folder.name}</span>

        {/* File count badge */}
        {folder.stats?.fileCount > 0 && (
          <span className="text-xs text-muted px-1.5 py-0.5 bg-bg rounded">
            {folder.stats.fileCount}
          </span>
        )}

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="p-1 rounded hover:bg-bg/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onCreateSubfolder?.(folder._id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg text-sm text-left"
                >
                  <FolderPlus className="w-4 h-4 text-muted" />
                  New Subfolder
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onRename?.(folder);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg text-sm text-left"
                >
                  <Edit3 className="w-4 h-4 text-muted" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDelete?.(folder);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg text-sm text-left text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child._id}
              folder={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Quick access item
function QuickAccessItem({ icon: Icon, label, isSelected, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'text-text hover:bg-bg'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted px-1.5 py-0.5 bg-bg rounded">
          {count}
        </span>
      )}
    </button>
  );
}

export default function FolderTree({
  tree = [],
  selectedId,
  onSelect,
  onCreateFolder,
  onCreateSubfolder,
  onRename,
  onDelete,
  quickAccess = {},
  isLoading
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Auto-expand parent folders when a folder is selected
  useMemo(() => {
    if (!selectedId || !tree.length) return;

    const findPath = (folders, targetId, path = []) => {
      for (const folder of folders) {
        if (folder._id === targetId) {
          return path;
        }
        if (folder.children?.length) {
          const found = findPath(folder.children, targetId, [...path, folder._id]);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(tree, selectedId);
    if (path && path.length > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        path.forEach(id => next.add(id));
        return next;
      });
    }
  }, [selectedId, tree]);

  const handleToggleExpand = (folderId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSelectRoot = () => {
    onSelect(null);
  };

  const isRootSelected = selectedId === null && !quickAccess.view;

  return (
    <div className="h-full flex flex-col">
      {/* Quick Access Section */}
      <div className="p-2 border-b border-border">
        <QuickAccessItem
          icon={Home}
          label="All Files"
          isSelected={isRootSelected}
          onClick={handleSelectRoot}
        />
        {quickAccess.showFavorites !== false && (
          <QuickAccessItem
            icon={Star}
            label="Favorites"
            isSelected={quickAccess.view === 'favorites'}
            onClick={() => onSelect('favorites')}
            count={quickAccess.favoritesCount}
          />
        )}
        {quickAccess.showRecent !== false && (
          <QuickAccessItem
            icon={Clock}
            label="Recent"
            isSelected={quickAccess.view === 'recent'}
            onClick={() => onSelect('recent')}
          />
        )}
        {quickAccess.showTrash !== false && (
          <QuickAccessItem
            icon={ArchiveIcon}
            label="Trash"
            isSelected={quickAccess.view === 'trash'}
            onClick={() => onSelect('trash')}
            count={quickAccess.trashCount}
          />
        )}
      </div>

      {/* Folders Section */}
      <div className="flex-1 overflow-auto p-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">
            Folders
          </span>
          <button
            onClick={() => onCreateFolder?.()}
            className="p-1 rounded hover:bg-bg transition-colors"
            title="New Folder"
          >
            <Plus className="w-4 h-4 text-muted" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-bg/50 rounded animate-pulse" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <Folder className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted">No folders yet</p>
            <button
              onClick={() => onCreateFolder?.()}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Create your first folder
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((folder) => (
              <FolderTreeItem
                key={folder._id}
                folder={folder}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={handleToggleExpand}
                onCreateSubfolder={onCreateSubfolder}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Storage usage (optional) */}
      {quickAccess.storageUsed !== undefined && quickAccess.storageLimit !== undefined && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Storage</span>
            <span>
              {formatStorageSize(quickAccess.storageUsed)} / {formatStorageSize(quickAccess.storageLimit)}
            </span>
          </div>
          <div className="h-1.5 bg-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (quickAccess.storageUsed / quickAccess.storageLimit) > 0.9
                  ? 'bg-red-500'
                  : (quickAccess.storageUsed / quickAccess.storageLimit) > 0.7
                  ? 'bg-yellow-500'
                  : 'bg-primary'
              }`}
              style={{
                width: `${Math.min(100, (quickAccess.storageUsed / quickAccess.storageLimit) * 100)}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format storage size
function formatStorageSize(bytes) {
  if (bytes === -1) return 'Unlimited';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
