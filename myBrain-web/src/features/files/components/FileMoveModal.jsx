import { useState } from 'react';
import { X, Folder, FolderOpen, ChevronRight, ChevronDown, Loader2, Home } from 'lucide-react';
import { useFolderTree, useMoveFolder } from '../hooks/useFolders';
import { useMoveFile, useBulkMoveFiles } from '../hooks/useFiles';
import useToast from '../../../hooks/useToast';

// Recursive folder tree item for selection
function FolderSelectItem({
  folder,
  level = 0,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  disabledIds = []
}) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedIds.has(folder._id);
  const isSelected = selectedId === folder._id;
  const isDisabled = disabledIds.includes(folder._id);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDisabled) {
      onSelect(folder._id);
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(folder._id);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed text-muted'
            : isSelected
            ? 'bg-primary/10 text-primary border border-primary/30'
            : 'text-text hover:bg-bg border border-transparent'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={handleToggle}
          className={`p-0.5 rounded hover:bg-bg/50 ${hasChildren ? 'visible' : 'invisible'}`}
          disabled={isDisabled}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: folder.color || undefined }} />
        ) : (
          <Folder className="w-5 h-5 flex-shrink-0" style={{ color: folder.color || undefined }} />
        )}

        {/* Folder name */}
        <span className="flex-1 text-sm truncate">{folder.name}</span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderSelectItem
              key={child._id}
              folder={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              disabledIds={disabledIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileMoveModal({
  isOpen,
  onClose,
  files = [],       // Array of file objects to move
  folder = null,    // Single folder to move (if moving a folder)
  onMoved
}) {
  const toast = useToast();
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const { data: folderTree = [], isLoading: treeLoading } = useFolderTree();
  const moveFile = useMoveFile();
  const bulkMoveFiles = useBulkMoveFiles();
  const moveFolder = useMoveFolder();

  const isMovingFolder = !!folder;
  const itemCount = isMovingFolder ? 1 : files.length;
  const itemLabel = isMovingFolder
    ? 'folder'
    : files.length === 1
    ? 'file'
    : `${files.length} files`;

  // Get IDs to disable (can't move folder into itself or its children)
  const disabledIds = [];
  if (isMovingFolder) {
    disabledIds.push(folder._id);
    // Also disable all children of the folder being moved
    const addChildIds = (f) => {
      if (f.children) {
        f.children.forEach((child) => {
          disabledIds.push(child._id);
          addChildIds(child);
        });
      }
    };
    const findFolder = (folders, id) => {
      for (const f of folders) {
        if (f._id === id) return f;
        if (f.children) {
          const found = findFolder(f.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const folderInTree = findFolder(folderTree, folder._id);
    if (folderInTree) {
      addChildIds(folderInTree);
    }
  }

  const handleToggleExpand = (folderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleMove = async () => {
    try {
      if (isMovingFolder) {
        await moveFolder.mutateAsync({
          id: folder._id,
          parentId: selectedFolderId,
        });
        toast.success('Folder moved');
      } else if (files.length === 1) {
        await moveFile.mutateAsync({
          id: files[0]._id,
          folderId: selectedFolderId,
        });
        toast.success('File moved');
      } else {
        await bulkMoveFiles.mutateAsync({
          fileIds: files.map((f) => f._id),
          folderId: selectedFolderId,
        });
        toast.success(`${files.length} files moved`);
      }
      onMoved?.();
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Failed to move');
    }
  };

  const handleClose = () => {
    setSelectedFolderId(null);
    setExpandedIds(new Set());
    onClose();
  };

  const isLoading = moveFile.isPending || bulkMoveFiles.isPending || moveFolder.isPending;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-panel border border-border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">
              Move {itemLabel}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            <p className="text-sm text-muted mb-4">
              Select a destination folder:
            </p>

            {/* Root folder option */}
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-2 ${
                selectedFolderId === null
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-text hover:bg-bg border border-transparent'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Root (No folder)</span>
            </div>

            {/* Folder tree */}
            {treeLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                <p className="text-sm text-muted mt-2">Loading folders...</p>
              </div>
            ) : folderTree.length === 0 ? (
              <div className="py-8 text-center">
                <Folder className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted">No folders available</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {folderTree.map((f) => (
                  <FolderSelectItem
                    key={f._id}
                    folder={f}
                    selectedId={selectedFolderId}
                    expandedIds={expandedIds}
                    onSelect={setSelectedFolderId}
                    onToggleExpand={handleToggleExpand}
                    disabledIds={disabledIds}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Moving...
                </>
              ) : (
                'Move Here'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
