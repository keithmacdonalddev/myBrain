import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Loader2,
  Check,
  AlertCircle,
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Inbox,
  CheckSquare,
  StickyNote,
  Image,
  FolderKanban,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import AdminNav from './components/AdminNav';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAdminSidebarConfig, useUpdateSidebarConfig, useResetSidebarConfig } from './hooks/useAdminUsers';

// Icon mapping for sidebar items
const ICON_MAP = {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Inbox,
  CheckSquare,
  StickyNote,
  Image,
  FolderKanban,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Shield
};

// Get icon component by name
function getIcon(iconName) {
  return ICON_MAP[iconName] || LayoutDashboard;
}

// Sortable item component
function SortableItem({ item, onToggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getIcon(item.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 bg-bg border border-border rounded-lg ${
        !item.visible ? 'opacity-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab text-muted hover:text-text active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Icon className="w-4 h-4 text-muted" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-text">{item.label}</span>
        {item.featureFlag && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-500 rounded">
            {item.featureFlag}
          </span>
        )}
        {item.requiresAdmin && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-500 rounded">
            Admin Only
          </span>
        )}
      </div>
      <button
        onClick={() => onToggleVisibility(item.key)}
        className={`p-1.5 rounded transition-colors ${
          item.visible
            ? 'text-green-500 hover:bg-green-500/10'
            : 'text-muted hover:bg-bg'
        }`}
        title={item.visible ? 'Hide item' : 'Show item'}
      >
        {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Drag overlay item (shown while dragging)
function DragOverlayItem({ item }) {
  const Icon = getIcon(item.icon);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-panel border-2 border-primary rounded-lg shadow-theme-elevated">
      <div className="p-1 text-muted">
        <GripVertical className="w-4 h-4" />
      </div>
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-text">{item.label}</span>
    </div>
  );
}

// Section component
function SectionGroup({ section, items, onReorder, onToggleVisibility, isExpanded, onToggleExpand }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = useState(null);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.key === active.id);
      const newIndex = items.findIndex((item) => item.key === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index
        }));
        onReorder(section.key, newItems);
      }
    }
  };

  const activeItem = items.find((item) => item.key === activeId);

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-bg/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted" />
          )}
          <span className="font-medium text-text">{section.label}</span>
          <span className="text-xs text-muted">({items.length} items)</span>
        </div>
        {section.collapsible && (
          <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
            Collapsible
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.key)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableItem
                  key={item.key}
                  item={item}
                  onToggleVisibility={onToggleVisibility}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeItem ? <DragOverlayItem item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>

          {items.length === 0 && (
            <p className="text-sm text-muted text-center py-4">
              No items in this section
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminSidebarPage() {
  const { data, isLoading, error, refetch } = useAdminSidebarConfig();
  const updateConfig = useUpdateSidebarConfig();
  const resetConfig = useResetSidebarConfig();

  const [items, setItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Initialize from data
  useEffect(() => {
    if (data) {
      setItems(data.items || []);
      setSections(data.sections || []);
      // Expand all sections by default
      const expanded = {};
      (data.sections || []).forEach((s) => {
        expanded[s.key] = true;
      });
      setExpandedSections(expanded);
    }
  }, [data]);

  // Track changes
  useEffect(() => {
    if (!data) return;

    const itemsChanged = JSON.stringify(items) !== JSON.stringify(data.items);
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(data.sections);

    setHasChanges(itemsChanged || sectionsChanged);
  }, [items, sections, data]);

  const handleReorder = (sectionKey, newSectionItems) => {
    setItems((prevItems) => {
      // Remove old items from this section
      const otherItems = prevItems.filter((item) => item.section !== sectionKey);
      // Add new items with updated order
      return [...otherItems, ...newSectionItems].sort((a, b) => {
        // Sort by section order first, then by item order within section
        const sectionA = sections.find((s) => s.key === a.section);
        const sectionB = sections.find((s) => s.key === b.section);
        const sectionOrderA = sectionA?.order ?? 0;
        const sectionOrderB = sectionB?.order ?? 0;
        if (sectionOrderA !== sectionOrderB) return sectionOrderA - sectionOrderB;
        return a.order - b.order;
      });
    });
  };

  const handleToggleVisibility = (itemKey) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.key === itemKey ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleToggleExpand = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({ items, sections });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save sidebar config:', err);
    }
  };

  const handleResetConfirm = async () => {
    try {
      await resetConfig.mutateAsync();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to reset sidebar config:', err);
    }
  };

  // Group items by section
  const getItemsBySection = (sectionKey) => {
    return items
      .filter((item) => item.section === sectionKey)
      .sort((a, b) => a.order - b.order);
  };

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen px-6 py-8">
      <AdminNav />

      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-text">Sidebar Management</h2>
          <p className="text-sm text-muted mt-1">
            Reorder and configure sidebar items. Changes affect all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResetDialog(true)}
            disabled={resetConfig.isPending}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-red-500/50 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              hasChanges
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-bg text-muted cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {updateConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Failed to load sidebar configuration</span>
          </div>
          <p className="text-sm text-red-400 mt-1">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-panel border border-border rounded-lg overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <div className="h-5 w-5 bg-bg rounded animate-pulse" />
                <div className="h-5 w-32 bg-bg rounded animate-pulse" />
              </div>
              <div className="p-4 pt-0 space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-12 bg-bg rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Section Groups */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {sortedSections.map((section) => (
            <SectionGroup
              key={section.key}
              section={section}
              items={getItemsBySection(section.key)}
              onReorder={handleReorder}
              onToggleVisibility={handleToggleVisibility}
              isExpanded={expandedSections[section.key]}
              onToggleExpand={() => handleToggleExpand(section.key)}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">About Sidebar Management</h4>
        <ul className="text-sm text-blue-300/80 space-y-1">
          <li><strong>Drag and drop:</strong> Reorder items within each section by dragging them.</li>
          <li><strong>Visibility:</strong> Toggle the eye icon to show/hide items from the sidebar.</li>
          <li><strong>Feature flags:</strong> Items with feature flags will only appear if the user has that feature enabled.</li>
          <li><strong>Admin only:</strong> Items marked as "Admin Only" only appear for admin users.</li>
          <li>Changes apply to all users when saved.</li>
        </ul>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetConfirm}
        title="Reset Sidebar Configuration"
        message="This will restore all sidebar items to their default order and visibility settings. Any custom changes will be lost. This action cannot be undone."
        confirmText="Reset to Defaults"
        cancelText="Keep Changes"
        variant="danger"
      />
    </div>
  );
}

export default AdminSidebarPage;
