import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import {
  StickyNote,
  LayoutDashboard,
  Shield,
  X,
  Calendar,
  CalendarDays,
  Inbox,
  CheckSquare,
  Image,
  FolderKanban,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { fetchLifeAreas, selectActiveLifeAreas, selectLifeAreasLoading, selectLifeArea, selectSelectedLifeAreaId, clearSelectedLifeArea } from '../../store/lifeAreasSlice';
import { useInboxCount } from '../../features/notes/hooks/useNotes';
import { useFeatureFlags } from '../../hooks/useFeatureFlag';
import { useSidebarConfig } from '../../hooks/useSidebarConfig';
import Tooltip from '../ui/Tooltip';

// Icon mapping for dynamic rendering
const ICON_MAP = {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Inbox,
  CheckSquare,
  StickyNote,
  Image,
  FolderKanban,
  FolderOpen,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Shield
};

// Get icon component by name
function getIcon(iconName) {
  return ICON_MAP[iconName] || LayoutDashboard;
}

// Default sidebar config (fallback if API fails)
const DEFAULT_CONFIG = {
  sections: [
    { key: 'main', label: 'Main', order: 0, collapsible: false },
    { key: 'working-memory', label: 'Working Memory', order: 1, collapsible: false },
    { key: 'categories', label: 'Categories', order: 2, collapsible: true },
    { key: 'beta', label: 'Beta', order: 3, collapsible: false },
    { key: 'admin', label: 'Admin', order: 4, collapsible: false }
  ],
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/app', section: 'main', order: 0, visible: true, featureFlag: null },
    { key: 'today', label: 'Today', icon: 'Calendar', path: '/app/today', section: 'main', order: 1, visible: true, featureFlag: null },
    { key: 'inbox', label: 'Inbox', icon: 'Inbox', path: '/app/inbox', section: 'main', order: 2, visible: true, featureFlag: null },
    { key: 'calendar', label: 'Calendar', icon: 'CalendarDays', path: '/app/calendar', section: 'working-memory', order: 0, visible: true, featureFlag: 'calendarEnabled' },
    { key: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/app/tasks', section: 'working-memory', order: 1, visible: true, featureFlag: null },
    { key: 'notes', label: 'Notes', icon: 'StickyNote', path: '/app/notes', section: 'working-memory', order: 2, visible: true, featureFlag: null },
    { key: 'images', label: 'Images', icon: 'Image', path: '/app/images', section: 'working-memory', order: 3, visible: true, featureFlag: 'imagesEnabled' },
    { key: 'files', label: 'Files', icon: 'FolderOpen', path: '/app/files', section: 'working-memory', order: 4, visible: true, featureFlag: 'filesEnabled' },
    { key: 'projects', label: 'Projects', icon: 'FolderKanban', path: '/app/projects', section: 'working-memory', order: 5, visible: true, featureFlag: 'projectsEnabled' },
    { key: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/app/fitness', section: 'beta', order: 0, visible: true, featureFlag: 'fitnessEnabled' },
    { key: 'kb', label: 'Knowledge Base', icon: 'BookOpen', path: '/app/kb', section: 'beta', order: 1, visible: true, featureFlag: 'kbEnabled' },
    { key: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/app/messages', section: 'beta', order: 2, visible: true, featureFlag: 'messagesEnabled' },
    { key: 'admin', label: 'Admin Panel', icon: 'Shield', path: '/admin', section: 'admin', order: 0, visible: true, featureFlag: null, requiresAdmin: true }
  ]
};

// Skeleton loading item
function NavItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-5 h-5 bg-border rounded animate-pulse" />
      <div className="h-4 w-20 bg-border rounded animate-pulse" />
    </div>
  );
}

// Section tooltip content
const SECTION_TOOLTIPS = {
  'working-memory': 'Quick access to your active work: today\'s schedule, tasks, notes, and current projects.',
  'categories': 'Filter by category. Categories help organize your work by areas of responsibility like Health, Career, or Finance.',
  'beta': 'Features in beta testing. Enable more in Admin > Users > Feature Flags.'
};

function Sidebar({ isOpen, onClose, isMobilePanel = false }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { data: inboxCount } = useInboxCount();
  const { data: sidebarConfig } = useSidebarConfig();

  // Life areas state
  const lifeAreas = useSelector(selectActiveLifeAreas);
  const lifeAreasLoading = useSelector(selectLifeAreasLoading);
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const [lifeAreasExpanded, setLifeAreasExpanded] = useState(false);
  const [mobileLifeAreasExpanded, setMobileLifeAreasExpanded] = useState(false);

  useEffect(() => {
    dispatch(fetchLifeAreas());
  }, [dispatch]);

  const isAdmin = user?.role === 'admin';

  // Feature flags for optional and beta features
  const featureFlags = useFeatureFlags([
    // Optional features
    'calendarEnabled',
    'imagesEnabled',
    'filesEnabled',
    'projectsEnabled',
    'lifeAreasEnabled',
    // Beta features
    'fitnessEnabled',
    'kbEnabled',
    'messagesEnabled'
  ]);

  // Use config from API or fallback to defaults
  const config = sidebarConfig || DEFAULT_CONFIG;

  // Filter and organize items based on config, feature flags, and user role
  const { filteredItems, sortedSections } = useMemo(() => {
    const sections = [...(config.sections || [])].sort((a, b) => a.order - b.order);

    const items = (config.items || [])
      .filter(item => {
        // Filter out invisible items
        if (!item.visible) return false;

        // Filter out admin-only items for non-admins
        if (item.requiresAdmin && !isAdmin) return false;

        // Filter out items with disabled feature flags
        if (item.featureFlag && !featureFlags[item.featureFlag]) return false;

        return true;
      })
      .sort((a, b) => a.order - b.order);

    return { filteredItems: items, sortedSections: sections };
  }, [config, featureFlags, isAdmin]);

  // Check if beta section has any visible items
  const hasBetaItems = useMemo(() => {
    return filteredItems.some(item => item.section === 'beta');
  }, [filteredItems]);

  // Group items by section
  const getItemsBySection = (sectionKey) => {
    return filteredItems.filter(item => item.section === sectionKey);
  };

  const handleLifeAreaClick = (lifeAreaId) => {
    if (selectedLifeAreaId === lifeAreaId) {
      dispatch(clearSelectedLifeArea());
    } else {
      dispatch(selectLifeArea(lifeAreaId));
    }
    onClose();
  };

  // Render a navigation item
  const renderNavItem = (item, isMobile = false) => {
    const Icon = getIcon(item.icon);
    const isExactMatch = item.path === '/app';
    const showInboxCount = item.key === 'inbox' && inboxCount > 0;

    const baseClasses = isMobile
      ? 'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[48px]'
      : 'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors';

    const activeClasses = isMobile
      ? 'bg-primary/10 text-primary'
      : 'bg-primary/10 text-primary';

    const inactiveClasses = isMobile
      ? 'text-text hover:bg-panel active:bg-panel/80'
      : 'text-text hover:bg-bg';

    return (
      <NavLink
        key={item.key}
        to={item.path}
        end={isExactMatch}
        onClick={onClose}
        className={({ isActive }) => {
          const pathMatch = !isExactMatch && location.pathname.startsWith(item.path);
          return `${baseClasses} ${isActive || pathMatch ? activeClasses : inactiveClasses}`;
        }}
      >
        <Icon className="w-5 h-5" />
        <span className={`text-sm font-medium ${showInboxCount ? 'flex-1' : ''}`}>{item.label}</span>
        {showInboxCount && (
          <span className={`px-${isMobile ? '2' : '1.5'} py-${isMobile ? '1' : '0.5'} bg-primary/10 text-primary text-xs font-medium rounded min-w-[${isMobile ? '1.5' : '1.25'}rem] text-center`}>
            {inboxCount}
          </span>
        )}
      </NavLink>
    );
  };

  // Render section header with optional tooltip
  const renderSectionHeader = (section, isMobile = false, isCollapsible = false, isExpanded = false, onToggle = null) => {
    const tooltip = SECTION_TOOLTIPS[section.key];
    const headerClasses = 'px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2';

    if (isCollapsible && onToggle) {
      const content = (
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-1 ${headerClasses} hover:text-text transition-colors`}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {section.label}
        </button>
      );

      if (tooltip && !isMobile) {
        return (
          <Tooltip content={tooltip} position="right" delay={500}>
            {content}
          </Tooltip>
        );
      }
      return content;
    }

    const content = <p className={`${headerClasses} ${tooltip && !isMobile ? 'cursor-help' : ''}`}>{section.label}</p>;

    if (tooltip && !isMobile) {
      return (
        <Tooltip content={tooltip} position="right" delay={500}>
          {content}
        </Tooltip>
      );
    }
    return content;
  };

  // When used inside mobile full-page panel, render simplified version
  if (isMobilePanel) {
    return (
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 pb-12 bg-bg">
        {sortedSections.map((section) => {
          // Skip categories section - render separately
          if (section.key === 'categories') {
            if (!featureFlags['lifeAreasEnabled'] || lifeAreas.length === 0) return null;

            return (
              <div key={section.key} className="pt-4">
                <button
                  onClick={() => setMobileLifeAreasExpanded(!mobileLifeAreasExpanded)}
                  className="w-full flex items-center gap-1 px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 hover:text-text transition-colors"
                >
                  {mobileLifeAreasExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Categories
                </button>

                {mobileLifeAreasExpanded && lifeAreas.map((la) => (
                  <button
                    key={la._id}
                    onClick={() => handleLifeAreaClick(la._id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[48px] ${
                      selectedLifeAreaId === la._id ? 'bg-primary/10 text-primary' : 'text-text hover:bg-panel active:bg-panel/80'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: la.color }} />
                    <span className="text-sm font-medium truncate">{la.name}</span>
                  </button>
                ))}
              </div>
            );
          }

          // Skip beta section if no items
          if (section.key === 'beta' && !hasBetaItems) return null;

          // Skip admin section for non-admins
          if (section.key === 'admin' && !isAdmin) return null;

          const sectionItems = getItemsBySection(section.key);
          if (sectionItems.length === 0 && section.key !== 'main') return null;

          return (
            <div key={section.key} className={section.key === 'main' ? '' : 'pt-4'}>
              {section.key !== 'main' && (
                <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {section.label}
                </p>
              )}
              {sectionItems.map((item) => renderNavItem(item, true))}
            </div>
          );
        })}

        {/* Version */}
        <div className="pt-8 pb-4">
          <p className="text-xs text-muted/50 text-center">myBrain v0.1.0</p>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-panel border-r border-border z-50
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:z-0
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden flex-shrink-0">
          <span className="font-semibold text-text">Menu</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 pb-12">
          {sortedSections.map((section) => {
            // Handle main section (Dashboard) - no header
            if (section.key === 'main') {
              const mainItems = getItemsBySection('main');
              return mainItems.map((item) => renderNavItem(item));
            }

            // Handle categories section separately (dynamic life areas)
            if (section.key === 'categories') {
              if (!featureFlags['lifeAreasEnabled'] || lifeAreas.length === 0) return null;

              return (
                <div key={section.key} className="pt-4">
                  {renderSectionHeader(section, false, true, lifeAreasExpanded, () => setLifeAreasExpanded(!lifeAreasExpanded))}

                  {lifeAreasExpanded && (
                    <>
                      {lifeAreasLoading ? (
                        <>
                          <NavItemSkeleton />
                          <NavItemSkeleton />
                        </>
                      ) : (
                        lifeAreas.map((la) => (
                          <button
                            key={la._id}
                            onClick={() => handleLifeAreaClick(la._id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              selectedLifeAreaId === la._id
                                ? 'bg-primary/10 text-primary'
                                : 'text-text hover:bg-bg'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: la.color }}
                            />
                            <span className="text-sm font-medium truncate">{la.name}</span>
                            {la.isDefault && (
                              <span className="text-[10px] text-muted">(default)</span>
                            )}
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              );
            }

            // Skip beta section if no items
            if (section.key === 'beta' && !hasBetaItems) return null;

            // Skip admin section for non-admins
            if (section.key === 'admin' && !isAdmin) return null;

            const sectionItems = getItemsBySection(section.key);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section.key} className="pt-4">
                {renderSectionHeader(section)}
                {sectionItems.map((item) => renderNavItem(item))}
              </div>
            );
          })}
        </nav>

        {/* Version footer */}
        <div className="flex-shrink-0 p-3 border-t border-border">
          <p className="text-xs text-muted/50 text-center">
            myBrain v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
