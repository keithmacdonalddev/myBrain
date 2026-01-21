import { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  Grid3X3,
  List,
  Heart,
  SortDesc,
  Tag,
  X,
  ChevronDown,
  ChevronRight,
  Upload,
  HardDrive,
  AlertCircle,
  CheckSquare,
  Square,
  Trash2,
  Loader2,
  Plus,
  MoreHorizontal,
  Download,
  Copy,
  FolderInput,
  Star,
  Clock,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Home,
} from 'lucide-react';
import {
  useFiles,
  useFileTags,
  useFileLimits,
  useToggleFileFavorite,
  useTrashFile,
  useBulkTrashFiles,
  useDownloadFile,
} from './hooks/useFiles';
import { useFolderTree, useFolderBreadcrumb, useTrashFolder, useDeleteFolder } from './hooks/useFolders';
import { useTrashedFiles } from './hooks/useFiles';
import FileUpload from './components/FileUpload';
import FileDetailsPanel from './components/FileDetailsPanel';
import FolderTree from './components/FolderTree';
import CreateFolderModal from './components/CreateFolderModal';
import FileMoveModal from './components/FileMoveModal';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useToast from '../../hooks/useToast';
import { formatBytes, formatRelativeDate, truncateFilename } from './utils/formatters';
import { fileCategories, getFileIcon, getCategoryColor } from './utils/fileTypes';

// Sort options
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-size', label: 'Largest first' },
  { value: 'size', label: 'Smallest first' },
  { value: 'originalName', label: 'Name A-Z' },
  { value: '-originalName', label: 'Name Z-A' },
];

// Icon components map
const iconComponents = {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FolderOpen,
};

function StorageBar({ limits }) {
  if (!limits) return null;

  const { storage, files } = limits;
  const storagePercentage = storage.unlimited ? 0 : storage.percentage;
  const isNearLimit = storagePercentage > 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">Storage used</span>
        <span className={isNearLimit ? 'text-warning' : 'text-text'}>
          {storage.currentFormatted} {!storage.unlimited && `/ ${storage.maxFormatted}`}
        </span>
      </div>
      {!storage.unlimited && (
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
      )}
      {!files.unlimited && (
        <p className="text-xs text-muted text-right">
          {files.current} / {files.max} files
        </p>
      )}
    </div>
  );
}

function FileIcon({ file, size = 'md' }) {
  const iconName = getFileIcon(file);
  const IconComponent = iconComponents[iconName] || File;
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  // For images, show thumbnail if available
  if (file.fileCategory === 'image' && file.thumbnailUrl) {
    return (
      <img
        src={file.thumbnailUrl}
        alt=""
        className={`${sizeClass} object-cover rounded`}
      />
    );
  }

  return (
    <IconComponent
      className={sizeClass}
      style={{ color: getCategoryColor(file.fileCategory) }}
    />
  );
}

function FileCard({ file, isSelected, onSelect, onClick, onFavorite }) {
  const toggleFavorite = useToggleFileFavorite();

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite.mutate(file._id);
    onFavorite?.();
  };

  const handleSelectClick = (e) => {
    e.stopPropagation();
    onSelect(file._id);
  };

  const isImage = file.fileCategory === 'image';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-panel border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
        isSelected ? 'ring-2 ring-primary' : 'border-border'
      }`}
    >
      {/* Preview area */}
      <div className="aspect-square flex items-center justify-center bg-bg/50">
        {isImage && file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileIcon file={file} size="lg" />
        )}
      </div>

      {/* Selection checkbox */}
      <button
        onClick={handleSelectClick}
        className={`absolute top-2 left-2 p-1 rounded transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-primary" />
        ) : (
          <Square className="w-5 h-5 text-white drop-shadow-lg" />
        )}
      </button>

      {/* Favorite button */}
      <button
        onClick={handleFavoriteClick}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
          file.favorite
            ? 'bg-amber-500/90 text-white opacity-100'
            : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70'
        }`}
      >
        <Star className={`w-4 h-4 ${file.favorite ? 'fill-current' : ''}`} />
      </button>

      {/* Info */}
      <div className="p-2 border-t border-border">
        <p className="text-sm text-text truncate" title={file.originalName}>
          {file.title || file.originalName}
        </p>
        <p className="text-xs text-muted">
          {formatBytes(file.size)} &bull; {formatRelativeDate(file.createdAt)}
        </p>
      </div>
    </div>
  );
}

function FileRow({ file, isSelected, onSelect, onClick, onFavorite }) {
  const toggleFavorite = useToggleFileFavorite();
  const downloadFile = useDownloadFile();

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite.mutate(file._id);
    onFavorite?.();
  };

  const handleSelectClick = (e) => {
    e.stopPropagation();
    onSelect(file._id);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const result = await downloadFile.mutateAsync(file._id);
      window.open(result.url, '_blank');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 bg-panel border rounded-lg cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
        isSelected ? 'ring-2 ring-primary' : 'border-border'
      }`}
    >
      {/* Selection */}
      <button
        onClick={handleSelectClick}
        className="flex-shrink-0"
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-primary" />
        ) : (
          <Square className="w-5 h-5 text-muted hover:text-text" />
        )}
      </button>

      {/* Icon */}
      <div className="flex-shrink-0">
        <FileIcon file={file} size="md" />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text truncate">
          {file.title || file.originalName}
        </p>
        {file.title && (
          <p className="text-xs text-muted truncate">{file.originalName}</p>
        )}
      </div>

      {/* Size */}
      <div className="hidden sm:block w-20 text-right text-sm text-muted">
        {formatBytes(file.size)}
      </div>

      {/* Date */}
      <div className="hidden md:block w-32 text-right text-sm text-muted">
        {formatRelativeDate(file.createdAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleFavoriteClick}
          className={`p-1.5 rounded transition-colors ${
            file.favorite ? 'text-amber-500' : 'text-muted hover:text-text'
          }`}
        >
          <Star className={`w-4 h-4 ${file.favorite ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded text-muted hover:text-text"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Breadcrumb({ folderId, onNavigate }) {
  const { data: breadcrumb = [] } = useFolderBreadcrumb(folderId);

  return (
    <div className="flex items-center gap-1 text-sm overflow-x-auto">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-bg text-muted hover:text-text"
      >
        <Home className="w-4 h-4" />
        <span>Files</span>
      </button>
      {breadcrumb.map((item, index) => (
        <div key={item._id} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-muted" />
          <button
            onClick={() => onNavigate(item._id)}
            className={`px-2 py-1 rounded hover:bg-bg ${
              index === breadcrumb.length - 1 ? 'text-text font-medium' : 'text-muted hover:text-text'
            }`}
          >
            {item.name}
          </button>
        </div>
      ))}
    </div>
  );
}

function FilesPage() {
  const toast = useToast();

  // State
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterCategory, setFilterCategory] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewFile, setViewFile] = useState(null);
  const [showBulkTrashConfirm, setShowBulkTrashConfirm] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [filesToMove, setFilesToMove] = useState([]);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [specialView, setSpecialView] = useState(null); // 'favorites', 'recent', 'trash'

  // Queries
  const { data, isLoading, refetch } = useFiles({
    folderId: currentFolderId,
    sort: sortBy,
    favorite: filterFavorites || undefined,
    fileCategory: filterCategory || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    q: searchQuery || undefined,
  });
  const { data: tagsData } = useFileTags();
  const { data: limits } = useFileLimits();
  const { data: folderTree = [], refetch: refetchFolders } = useFolderTree();
  const { data: trashedFilesData } = useTrashedFiles();
  const bulkTrash = useBulkTrashFiles();
  const trashFolder = useTrashFolder();
  const deleteFolder = useDeleteFolder();

  const files = data?.files || [];
  const tags = tagsData || [];
  const pagination = data?.pagination;

  // Filter files by search query (client-side for instant feedback)
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(file =>
      (file.title || '').toLowerCase().includes(q) ||
      (file.originalName || '').toLowerCase().includes(q) ||
      (file.description || '').toLowerCase().includes(q) ||
      (file.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [files, searchQuery]);

  // Selection handlers
  const handleSelect = (id) => {
    setSelectedFiles(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f._id));
    }
  };

  const handleBulkTrash = async () => {
    try {
      await bulkTrash.mutateAsync(selectedFiles);
      toast.success(`Moved ${selectedFiles.length} files to trash`);
      setSelectedFiles([]);
      setShowBulkTrashConfirm(false);
    } catch (err) {
      toast.error('Failed to move files to trash');
    }
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterFavorites(false);
    setFilterCategory(null);
    setSelectedTags([]);
    setSortBy('-createdAt');
  };

  const hasFilters = searchQuery || filterFavorites || filterCategory || selectedTags.length > 0 || sortBy !== '-createdAt';

  // Folder handlers
  const handleCreateFolder = (parentId = null) => {
    setCreateFolderParentId(parentId);
    setShowCreateFolderModal(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await trashFolder.mutateAsync(folderToDelete._id);
      toast.success('Folder moved to trash');
      refetchFolders();
      if (currentFolderId === folderToDelete._id) {
        setCurrentFolderId(null);
      }
    } catch (err) {
      toast.error('Failed to delete folder');
    }
    setShowDeleteFolderConfirm(false);
    setFolderToDelete(null);
  };

  const handleFolderSelect = (id) => {
    // Handle special views
    if (id === 'favorites' || id === 'recent' || id === 'trash') {
      setSpecialView(id);
      setCurrentFolderId(null);
    } else {
      setSpecialView(null);
      setCurrentFolderId(id);
    }
  };

  const handleMoveSelectedFiles = () => {
    const selectedFileObjects = files.filter(f => selectedFiles.includes(f._id));
    setFilesToMove(selectedFileObjects);
    setShowMoveModal(true);
  };

  // Limit checks
  const canUpload = !limits || limits.files.unlimited || limits.files.current < limits.files.max;
  const isNearFileLimit = limits && !limits.files.unlimited && limits.files.current >= limits.files.max * 0.8;

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader title="Files" icon={FolderOpen} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Folder Tree */}
        {showSidebar && (
          <div className="hidden lg:flex w-64 border-r border-border flex-col bg-panel">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-medium text-text">Folders</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <FolderTree
                tree={folderTree}
                selectedId={specialView || currentFolderId}
                onSelect={handleFolderSelect}
                onCreateFolder={() => handleCreateFolder()}
                onCreateSubfolder={handleCreateFolder}
                onRename={(folder) => setRenamingFolder(folder)}
                onDelete={(folder) => {
                  setFolderToDelete(folder);
                  setShowDeleteFolderConfirm(true);
                }}
                quickAccess={{
                  view: specialView,
                  showFavorites: true,
                  showRecent: true,
                  showTrash: true,
                  trashCount: trashedFilesData?.files?.length || 0,
                  storageUsed: limits?.storage?.current,
                  storageLimit: limits?.storage?.max,
                }}
                isLoading={false}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-text">Files</h1>
                  <p className="text-sm text-muted">
                    {pagination?.total || 0} {(pagination?.total || 0) === 1 ? 'file' : 'files'}
                  </p>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setShowUpload(!showUpload)}
                disabled={!canUpload}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                  canUpload
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-muted/20 text-muted cursor-not-allowed'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload
                {!canUpload && <span className="text-xs">(Limit reached)</span>}
              </button>
            </div>

            {/* Breadcrumb */}
            {currentFolderId && (
              <div className="mb-4">
                <Breadcrumb
                  folderId={currentFolderId}
                  onNavigate={setCurrentFolderId}
                />
              </div>
            )}

            {/* Upload Section */}
            {showUpload && canUpload && (
              <div className="mb-6">
                <FileUpload
                  folderId={currentFolderId}
                  onUploadComplete={() => {
                    refetch();
                    setShowUpload(false);
                  }}
                />
              </div>
            )}

            {isNearFileLimit && canUpload && (
              <div className="mb-4 flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="w-4 h-4" />
                <span>You're approaching your file limit</span>
              </div>
            )}

            {/* Filters & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full pl-10 pr-4 py-2 bg-panel border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  filterFavorites
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : 'bg-panel border-border text-muted hover:text-text'
                }`}
              >
                <Star className={`w-4 h-4 ${filterFavorites ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">Favorites</span>
              </button>

              {/* Category Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    filterCategory
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-panel border-border text-muted hover:text-text'
                  }`}
                >
                  <File className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {filterCategory ? fileCategories.find(c => c.value === filterCategory)?.label : 'Type'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showCategoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                    <div className="absolute top-full right-0 mt-1 w-48 bg-panel border border-border rounded-lg shadow-theme-floating z-20 py-1">
                      <button
                        onClick={() => {
                          setFilterCategory(null);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-bg ${
                          !filterCategory ? 'text-primary bg-primary/5' : 'text-text'
                        }`}
                      >
                        All types
                      </button>
                      {fileCategories.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setFilterCategory(cat.value);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-bg ${
                            filterCategory === cat.value ? 'text-primary bg-primary/5' : 'text-text'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-panel border border-border rounded-lg text-muted hover:text-text"
                >
                  <SortDesc className="w-4 h-4" />
                  <span className="hidden sm:inline">Sort</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                    <div className="absolute top-full right-0 mt-1 w-44 bg-panel border border-border rounded-lg shadow-theme-floating z-20 py-1">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-bg ${
                            sortBy === option.value ? 'text-primary bg-primary/5' : 'text-text'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'bg-panel text-muted hover:text-text'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'bg-panel text-muted hover:text-text'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {hasFilters && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-muted">Active filters:</span>
                {filterCategory && (
                  <button
                    onClick={() => setFilterCategory(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                  >
                    {fileCategories.find(c => c.value === filterCategory)?.label}
                    <X className="w-3 h-3" />
                  </button>
                )}
                {selectedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                {filterFavorites && (
                  <button
                    onClick={() => setFilterFavorites(false)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-xs"
                  >
                    Favorites
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted hover:text-text underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-panel border border-border rounded-lg">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary hover:underline"
                >
                  {selectedFiles.length === filteredFiles.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-sm text-muted">
                  {selectedFiles.length} selected
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleMoveSelectedFiles}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm"
                  >
                    <FolderInput className="w-4 h-4" />
                    Move
                  </button>
                  <button
                    onClick={() => setShowBulkTrashConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Trash
                  </button>
                </div>
              </div>
            )}

            {/* Files Grid/List */}
            {isLoading ? (
              <div className={viewMode === 'grid' ? 'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'space-y-2'}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={viewMode === 'grid' ? 'aspect-square bg-panel border border-border rounded-lg animate-pulse' : 'h-16 bg-panel border border-border rounded-lg animate-pulse'} />
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="w-16 h-16 text-muted/30 mb-4" />
                <h3 className="text-lg font-medium text-text mb-1">
                  {hasFilters ? 'No files match your filters' : currentFolderId ? 'This folder is empty' : 'No files yet'}
                </h3>
                <p className="text-sm text-muted mb-4">
                  {hasFilters
                    ? 'Try adjusting your filters or search query'
                    : 'Upload your first file to get started'
                  }
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file._id}
                    file={file}
                    isSelected={selectedFiles.includes(file._id)}
                    onSelect={handleSelect}
                    onClick={() => setViewFile(file)}
                    onFavorite={refetch}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <FileRow
                    key={file._id}
                    file={file}
                    isSelected={selectedFiles.includes(file._id)}
                    onSelect={handleSelect}
                    onClick={() => setViewFile(file)}
                    onFavorite={refetch}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Details Panel */}
      {viewFile && (
        <FileDetailsPanel
          file={viewFile}
          onClose={() => setViewFile(null)}
          onUpdated={() => {
            refetch();
          }}
          onDeleted={() => {
            refetch();
            setSelectedFiles(prev => prev.filter(id => id !== viewFile._id));
            setViewFile(null);
          }}
        />
      )}

      {/* Bulk Trash Confirmation */}
      <ConfirmDialog
        isOpen={showBulkTrashConfirm}
        onClose={() => setShowBulkTrashConfirm(false)}
        onConfirm={handleBulkTrash}
        title="Move to Trash"
        message={`Are you sure you want to move ${selectedFiles.length} files to trash?`}
        confirmText={bulkTrash.isPending ? 'Moving...' : 'Move to Trash'}
        variant="danger"
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setCreateFolderParentId(null);
        }}
        parentId={createFolderParentId}
        onCreated={() => {
          refetchFolders();
        }}
      />

      {/* Move Files Modal */}
      <FileMoveModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setFilesToMove([]);
        }}
        files={filesToMove}
        onMoved={() => {
          refetch();
          refetchFolders();
          setSelectedFiles([]);
        }}
      />

      {/* Delete Folder Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteFolderConfirm}
        onClose={() => {
          setShowDeleteFolderConfirm(false);
          setFolderToDelete(null);
        }}
        onConfirm={handleDeleteFolder}
        title="Delete Folder"
        message={`Are you sure you want to delete "${folderToDelete?.name}"? All files in this folder will be moved to trash.`}
        confirmText={trashFolder.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

function FilesRoutes() {
  return (
    <Routes>
      <Route index element={<FilesPage />} />
    </Routes>
  );
}

export default FilesRoutes;
