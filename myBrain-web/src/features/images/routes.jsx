import { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Image as ImageIcon,
  Search,
  Grid3X3,
  LayoutGrid,
  Heart,
  SortDesc,
  Tag,
  X,
  ChevronDown,
  Upload,
  HardDrive,
  AlertCircle,
  CheckSquare,
  Square,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  useImages,
  useImageTags,
  useImageLimits,
  useToggleFavorite,
  useDeleteImage,
  useBulkDeleteImages
} from './hooks/useImages';
import ImageUpload from './components/ImageUpload';
import ImageDetailsModal from './components/ImageDetailsModal';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useToast from '../../hooks/useToast';

// Sort options
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-size', label: 'Largest first' },
  { value: 'size', label: 'Smallest first' },
  { value: 'originalName', label: 'Name A-Z' },
  { value: '-originalName', label: 'Name Z-A' },
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes === -1) return 'Unlimited';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StorageBar({ current, max }) {
  const percentage = max === -1 ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = percentage > 80;
  const isUnlimited = max === -1;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">Storage used</span>
        <span className={isNearLimit && !isUnlimited ? 'text-warning' : 'text-text'}>
          {formatBytes(current)} {!isUnlimited && `/ ${formatBytes(max)}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ImageCard({ image, isSelected, onSelect, onClick, onFavorite }) {
  const toggleFavorite = useToggleFavorite();

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite.mutate(image._id);
    onFavorite?.();
  };

  const handleSelectClick = (e) => {
    e.stopPropagation();
    onSelect(image._id);
  };

  return (
    <div
      onClick={onClick}
      className={`group relative aspect-square bg-panel border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
        isSelected ? 'ring-2 ring-primary' : 'border-border'
      }`}
    >
      {/* Image */}
      <img
        src={image.secureUrl}
        alt={image.alt || image.originalName}
        className="w-full h-full object-cover"
        loading="lazy"
      />

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
          image.favorite
            ? 'bg-red-500/90 text-white opacity-100'
            : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70'
        }`}
      >
        <Heart className={`w-4 h-4 ${image.favorite ? 'fill-current' : ''}`} />
      </button>

      {/* Bottom overlay with info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">
          {image.title || image.originalName}
        </p>
        <p className="text-white/70 text-[10px]">
          {image.width}x{image.height} &bull; {formatBytes(image.size)}
        </p>
      </div>

      {/* Color swatch */}
      {image.dominantColor && (
        <div
          className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: image.dominantColor }}
        />
      )}
    </div>
  );
}

function ImagesLibraryPage() {
  const toast = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [viewImage, setViewImage] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [gridSize, setGridSize] = useState('normal'); // 'compact' or 'normal'

  // Queries
  const { data, isLoading, refetch } = useImages({
    folder: 'library',
    sort: sortBy,
    favorite: filterFavorites || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
  });
  const { data: tagsData } = useImageTags();
  const { data: limits } = useImageLimits();
  const bulkDelete = useBulkDeleteImages();

  const images = data?.images || [];
  const tags = tagsData || [];
  const pagination = data?.pagination;

  // Filter images by search query (client-side for instant feedback)
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images;
    const q = searchQuery.toLowerCase();
    return images.filter(img =>
      (img.title || '').toLowerCase().includes(q) ||
      (img.originalName || '').toLowerCase().includes(q) ||
      (img.description || '').toLowerCase().includes(q) ||
      (img.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [images, searchQuery]);

  // Selection handlers
  const handleSelect = (id) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img._id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(selectedImages);
      toast.success(`Deleted ${selectedImages.length} images`);
      setSelectedImages([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      toast.error('Failed to delete images');
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
    setSelectedTags([]);
    setSortBy('-createdAt');
  };

  const hasFilters = searchQuery || filterFavorites || selectedTags.length > 0 || sortBy !== '-createdAt';

  // Limit checks
  const canUpload = !limits || limits.images.max === -1 || limits.images.current < limits.images.max;
  const isNearImageLimit = limits && limits.images.max !== -1 && limits.images.current >= limits.images.max * 0.8;

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader title="Images" icon={ImageIcon} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-text">Image Library</h1>
                <p className="text-sm text-muted">
                  {pagination?.total || 0} {(pagination?.total || 0) === 1 ? 'image' : 'images'}
                </p>
              </div>
            </div>

            {/* Storage & Limits */}
            {limits && (
              <div className="w-64">
                <StorageBar
                  current={limits.storage.currentBytes}
                  max={limits.storage.maxBytes}
                />
                {limits.images.max !== -1 && (
                  <p className="text-xs text-muted mt-1 text-right">
                    {limits.images.current} / {limits.images.max} images
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mobile storage display */}
          {limits && (
            <div className="sm:hidden mb-4">
              <StorageBar
                current={limits.storage.currentBytes}
                max={limits.storage.maxBytes}
              />
            </div>
          )}

          {/* Upload Section (Collapsible) */}
          <div className="mb-6">
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
              Upload Image
              {!canUpload && <span className="text-xs">(Limit reached)</span>}
            </button>

            {showUpload && canUpload && (
              <div className="mt-4 max-w-md">
                <ImageUpload
                  onUploadComplete={() => {
                    refetch();
                    setShowUpload(false);
                  }}
                />
              </div>
            )}

            {isNearImageLimit && canUpload && (
              <div className="mt-2 flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="w-4 h-4" />
                <span>You're approaching your image limit</span>
              </div>
            )}
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images..."
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
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-panel border-border text-muted hover:text-text'
              }`}
            >
              <Heart className={`w-4 h-4 ${filterFavorites ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Favorites</span>
            </button>

            {/* Tags Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  selectedTags.length > 0
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-panel border-border text-muted hover:text-text'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {selectedTags.length > 0 ? `${selectedTags.length} tags` : 'Tags'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showTagDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-panel glass border border-border rounded-lg shadow-theme-floating z-20 py-1 max-h-64 overflow-auto">
                    {tags.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted">No tags yet</p>
                    ) : (
                      tags.map(({ tag, count }) => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-bg ${
                            selectedTags.includes(tag) ? 'text-primary' : 'text-text'
                          }`}
                        >
                          <span>{tag}</span>
                          <span className="text-xs text-muted">{count}</span>
                        </button>
                      ))
                    )}
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
                  <div className="absolute top-full right-0 mt-1 w-44 bg-panel glass border border-border rounded-lg shadow-theme-floating z-20 py-1">
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

            {/* Grid Size Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setGridSize('normal')}
                className={`p-2 ${gridSize === 'normal' ? 'bg-primary/10 text-primary' : 'bg-panel text-muted hover:text-text'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridSize('compact')}
                className={`p-2 ${gridSize === 'compact' ? 'bg-primary/10 text-primary' : 'bg-panel text-muted hover:text-text'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-muted">Active filters:</span>
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs"
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
          {selectedImages.length > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-panel border border-border rounded-lg">
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary hover:underline"
              >
                {selectedImages.length === filteredImages.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-sm text-muted">
                {selectedImages.length} selected
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete selected
              </button>
            </div>
          )}

          {/* Gallery */}
          {isLoading ? (
            <div className={`grid gap-3 ${
              gridSize === 'compact'
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            }`}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-panel border border-border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ImageIcon className="w-16 h-16 text-muted/30 mb-4" />
              <h3 className="text-lg font-medium text-text mb-1">
                {hasFilters ? 'No images match your filters' : 'No images yet'}
              </h3>
              <p className="text-sm text-muted mb-4">
                {hasFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Upload your first image to get started'
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
          ) : (
            <div className={`grid gap-3 ${
              gridSize === 'compact'
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            }`}>
              {filteredImages.map((image) => (
                <ImageCard
                  key={image._id}
                  image={image}
                  isSelected={selectedImages.includes(image._id)}
                  onSelect={handleSelect}
                  onClick={() => setViewImage(image)}
                  onFavorite={refetch}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Details Modal */}
      {viewImage && (
        <ImageDetailsModal
          image={viewImage}
          images={filteredImages}
          onClose={() => setViewImage(null)}
          onNavigate={setViewImage}
          onDeleted={() => {
            refetch();
            setSelectedImages(prev => prev.filter(id => id !== viewImage._id));
          }}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Images"
        message={`Are you sure you want to delete ${selectedImages.length} images? This action cannot be undone.`}
        confirmText={bulkDelete.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}

function ImagesRoutes() {
  return (
    <Routes>
      <Route index element={<ImagesLibraryPage />} />
    </Routes>
  );
}

export default ImagesRoutes;
