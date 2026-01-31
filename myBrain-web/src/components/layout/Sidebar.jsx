import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronLeft,
  Dumbbell,
  BookOpen,
  MessageSquare,
  Users,
  Share2,
  Bell,
  Plus,
  Zap,
  FileUp
} from 'lucide-react';
import { fetchLifeAreas, selectActiveLifeAreas, selectLifeAreasLoading, selectLifeArea, selectSelectedLifeAreaId, clearSelectedLifeArea } from '../../store/lifeAreasSlice';
import { toggleSidebarCollapsed, selectSidebarCollapsed, syncSidebarToServer } from '../../store/sidebarSlice';
import { useInboxCount, useNotes } from '../../features/notes/hooks/useNotes';
import { useTasks, useTodayView } from '../../features/tasks/hooks/useTasks';
import NavItem from '../ui/NavItem';
import { useFeatureFlag, useFeatureFlags } from '../../hooks/useFeatureFlag';
import { useSidebarConfig } from '../../hooks/useSidebarConfig';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { useQuickCapture } from '../../contexts/QuickCaptureContext';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData';
import Tooltip from '../ui/Tooltip';
import QuickActionButton from '../ui/QuickActionButton';
import ActivityRings from '../ui/ActivityRings';
import StreakBanner from '../ui/StreakBanner';
import SidebarFavorites from './SidebarFavorites';
import SidebarProjects from './SidebarProjects';

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
  Users,
  Share2,
  Bell,
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
    { key: 'social', label: 'Social', order: 2, collapsible: false },
    { key: 'categories', label: 'Categories', order: 3, collapsible: true },
    { key: 'beta', label: 'Beta', order: 4, collapsible: true },
    { key: 'admin', label: 'Admin', order: 5, collapsible: false }
  ],
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/app', section: 'main', order: 0, visible: true, featureFlag: null },
    { key: 'today', label: 'Today', icon: 'Calendar', path: '/app/today', section: 'main', order: 1, visible: true, featureFlag: null },
    { key: 'inbox', label: 'Inbox', icon: 'Inbox', path: '/app/inbox', section: 'main', order: 2, visible: true, featureFlag: null },
    { key: 'notes', label: 'Notes', icon: 'StickyNote', path: '/app/notes', section: 'working-memory', order: 0, visible: true, featureFlag: null },
    { key: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/app/tasks', section: 'working-memory', order: 1, visible: true, featureFlag: null },
    { key: 'images', label: 'Images', icon: 'Image', path: '/app/images', section: 'working-memory', order: 3, visible: true, featureFlag: 'imagesEnabled' },
    { key: 'files', label: 'Files', icon: 'FolderOpen', path: '/app/files', section: 'working-memory', order: 4, visible: true, featureFlag: 'filesEnabled' },
    { key: 'calendar', label: 'Calendar', icon: 'CalendarDays', path: '/app/calendar', section: 'working-memory', order: 5, visible: true, featureFlag: 'calendarEnabled' },
    { key: 'connections', label: 'Connections', icon: 'Users', path: '/app/social/connections', section: 'social', order: 0, visible: true, featureFlag: 'socialEnabled' },
    { key: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/app/messages', section: 'social', order: 1, visible: true, featureFlag: 'socialEnabled' },
    { key: 'shared', label: 'Shared with Me', icon: 'Share2', path: '/app/social/shared', section: 'social', order: 2, visible: true, featureFlag: 'socialEnabled' },
    { key: 'myShares', label: 'My Shares', icon: 'ExternalLink', path: '/app/social/my-shares', section: 'social', order: 3, visible: true, featureFlag: 'socialEnabled' },
    { key: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/app/fitness', section: 'beta', order: 0, visible: true, featureFlag: 'fitnessEnabled' },
    { key: 'kb', label: 'Knowledge Base', icon: 'BookOpen', path: '/app/kb', section: 'beta', order: 1, visible: true, featureFlag: 'kbEnabled' },
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
  'social': 'Connect with others, share content, and collaborate.',
  'categories': 'Filter by category. Categories help organize your work by areas of responsibility like Health, Career, or Finance.',
  'beta': 'Features in beta testing. Enable more in Admin > Users > Feature Flags.'
};

// Item tooltip content
const ITEM_TOOLTIPS = {
  'dashboard': 'Your home base with an overview of tasks, notes, and recent activity',
  'today': 'View tasks and events scheduled for today',
  'inbox': 'Unprocessed notes and quick captures waiting for review',
  'notes': 'All your notes organized by tags, categories, and dates',
  'tasks': 'Manage your tasks, to-dos, and action items',
  'projects': 'Track larger initiatives with multiple tasks and milestones',
  'images': 'Browse and manage your uploaded images and media',
  'files': 'Store and organize your files and documents',
  'calendar': 'View and manage your schedule and events',
  'connections': 'Manage your connections and find new people to connect with',
  'shared': 'View projects, tasks, notes, and files shared with you',
  'fitness': 'Track workouts, health metrics, and fitness goals',
  'kb': 'Build your personal knowledge base and reference library',
  'messages': 'Send and receive messages with connections',
  'admin': 'System administration, user management, and analytics'
};

function Sidebar({ isOpen, onClose, isMobilePanel = false }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data: inboxCount } = useInboxCount();
  const { data: notesData } = useNotes();
  const { data: tasksData } = useTasks({ status: 'todo' });
  const { data: todayData } = useTodayView();
  const { data: sidebarConfig } = useSidebarConfig();
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();

  // Check if V2 dashboard styling is enabled
  const isV2 = useFeatureFlag('dashboardV2Enabled');

  // Calculate today's progress values for Activity Rings
  // Fitness: Based on task completion rate from dashboard stats
  // Health: Based on events completed today (simplified for now)
  // Focus: Based on completion of priority tasks
  const todayProgress = useMemo(() => {
    const stats = dashboardData?.stats;
    const eventsToday = dashboardData?.events?.today || [];
    const urgentItems = dashboardData?.urgentItems;

    // Fitness progress: Task completion rate
    const fitnessProgress = stats?.tasks?.completionRate ?? 0;

    // Health progress: Based on events completed today
    // For now, calculate as percentage of events that have passed
    const now = new Date();
    const passedEvents = eventsToday.filter(event => {
      const endTime = new Date(event.endTime || event.startTime);
      return endTime < now;
    });
    const healthProgress = eventsToday.length > 0
      ? Math.round((passedEvents.length / eventsToday.length) * 100)
      : 0;

    // Focus progress: Inverse of urgent items remaining (more complete = fewer urgent items)
    // If no overdue and few due today, high focus score
    const overdue = urgentItems?.counts?.overdue ?? 0;
    const dueToday = urgentItems?.counts?.today ?? 0;
    const totalUrgent = overdue + dueToday;
    // Max 10 urgent items for scale; more than 10 = 0% focus score
    const focusProgress = totalUrgent === 0 ? 100 : Math.max(0, 100 - (totalUrgent * 10));

    return {
      fitness: Math.min(100, Math.max(0, fitnessProgress)),
      health: Math.min(100, Math.max(0, healthProgress)),
      focus: Math.min(100, Math.max(0, focusProgress))
    };
  }, [dashboardData]);

  // Calculate streak (consecutive days with activity)
  // For now, use a placeholder or derive from dashboard data if available
  const streakCount = useMemo(() => {
    // TODO: Implement proper streak calculation from user activity data
    // For now, return a placeholder based on task completion
    const hasActivity = dashboardData?.stats?.tasks?.completed > 0;
    return hasActivity ? 5 : 0; // Placeholder: show 5 if active, 0 if not
  }, [dashboardData]);

  // Panel contexts for quick actions (V2 only)
  const { openNewTask } = useTaskPanel();
  const { openNewNote } = useNotePanel();
  const { openCapture } = useQuickCapture();

  // Quick action handlers
  const handleNewTask = () => openNewTask();
  const handleNewNote = () => openNewNote();
  const handleNewEvent = () => navigate('/app/calendar/new');
  const handleNewFile = () => navigate('/app/files');
  const handleQuickCapture = () => openCapture();

  // Sidebar collapsed state from Redux (persisted in localStorage)
  const isCollapsed = useSelector(selectSidebarCollapsed);

  // Life areas state
  const lifeAreas = useSelector(selectActiveLifeAreas);
  const lifeAreasLoading = useSelector(selectLifeAreasLoading);
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const [lifeAreasExpanded, setLifeAreasExpanded] = useState(false);
  const [mobileLifeAreasExpanded, setMobileLifeAreasExpanded] = useState(false);
  const [betaExpanded, setBetaExpanded] = useState(false);
  const [mobileBetaExpanded, setMobileBetaExpanded] = useState(false);

  useEffect(() => {
    dispatch(fetchLifeAreas());
  }, [dispatch]);

  const isAdmin = user?.role === 'admin';

  // Toggle sidebar collapsed state
  // Updates localStorage immediately for instant UI, then syncs to server
  const handleToggleCollapse = () => {
    dispatch(toggleSidebarCollapsed());
    // Sync to server in background (fire-and-forget)
    // The new state is the opposite of current state
    dispatch(syncSidebarToServer(!isCollapsed));
  };

  // Feature flags for optional and beta features
  const featureFlags = useFeatureFlags([
    // Optional features
    'calendarEnabled',
    'imagesEnabled',
    'filesEnabled',
    'projectsEnabled',
    'lifeAreasEnabled',
    // Social features
    'socialEnabled',
    // Beta features
    'fitnessEnabled',
    'kbEnabled'
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
    const notesCount = notesData?.notes?.length || 0;
    const showNotesCount = item.key === 'notes' && notesCount > 0;
    const tasksCount = tasksData?.tasks?.length || 0;
    const showTasksCount = item.key === 'tasks' && tasksCount > 0;
    const showBadge = showInboxCount || showNotesCount || showTasksCount;
    const badgeCount = showInboxCount ? inboxCount : showNotesCount ? notesCount : showTasksCount ? tasksCount : 0;
    const tooltip = ITEM_TOOLTIPS[item.key];

    // When collapsed (desktop), show only icons with tooltips showing the label
    const showCollapsed = isCollapsed && !isMobile;

    const baseClasses = isMobile
      ? 'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors min-h-[48px]'
      : showCollapsed
        ? 'w-full flex items-center justify-center py-1.5 rounded-lg transition-all duration-300 ease-out relative'
        : 'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-out relative';

    // V2 uses CSS variables for consistent styling across the app
    const activeClasses = isMobile
      ? 'bg-primary/10 text-primary'
      : isV2
        ? 'sidebar-v2-nav-active'
        : 'bg-primary/10 text-primary';

    const inactiveClasses = isMobile
      ? 'text-text hover:bg-panel active:bg-panel/80'
      : isV2
        ? 'sidebar-v2-nav-item'
        : 'text-text hover:bg-bg';

    const navLink = (
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
        {/* When collapsed, center icon in container with badge overlaid */}
        {showCollapsed ? (
          <>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {showBadge && (
              <span className="absolute top-1 right-1 px-1 py-0.5 bg-primary text-white text-[10px] font-medium rounded-full min-w-[16px] text-center transition-all duration-300 ease-out shadow-sm">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </>
        ) : (
          <>
            <Icon className="w-5 h-5 flex-shrink-0" />
            {/* Label with opacity transition - always rendered but fades out when collapsed */}
            <span
              className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out ${showBadge ? 'flex-1' : ''}`}
              style={{
                opacity: showCollapsed ? 0 : 1,
                maxWidth: showCollapsed ? '0px' : '180px',
                overflow: 'hidden'
              }}
            >
              {item.label}
            </span>
            {/* Badge for counts - inline when expanded */}
            {showBadge && (
              <span className={`px-${isMobile ? '2' : '1.5'} py-${isMobile ? '1' : '0.5'} bg-primary/10 text-primary text-xs font-medium rounded min-w-[${isMobile ? '1.5' : '1.25'}rem] text-center transition-all duration-300 ease-out`}>
                {badgeCount}
              </span>
            )}
          </>
        )}
      </NavLink>
    );

    // Add tooltip for collapsed state (showing label) or desktop expanded (showing description)
    if (showCollapsed) {
      // When collapsed, always show tooltip with label
      return (
        <Tooltip key={item.key} content={item.label} position="right" delay={0} ignoreGlobalSetting>
          {navLink}
        </Tooltip>
      );
    }

    // Add tooltip for desktop expanded (showing description)
    if (tooltip && !isMobile) {
      return (
        <Tooltip key={item.key} content={tooltip} position="right" delay={500}>
          {navLink}
        </Tooltip>
      );
    }

    return navLink;
  };

  // Render section header with optional tooltip
  const renderSectionHeader = (section, isMobile = false, isCollapsible = false, isExpanded = false, onToggle = null) => {
    const tooltip = SECTION_TOOLTIPS[section.key];
    const showCollapsed = isCollapsed && !isMobile;

    // When collapsed, show a subtle divider instead of section header
    if (showCollapsed) {
      return <div className="h-px bg-border my-2 mx-2 transition-all duration-300 ease-out" />;
    }

    const headerClasses = 'px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2';

    if (isCollapsible && onToggle) {
      const content = (
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-1 ${headerClasses} hover:text-text transition-all duration-300 ease-out`}
          aria-label={isExpanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
          aria-expanded={isExpanded}
        >
          <ChevronRight className={`w-3 h-3 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-90' : ''}`} />
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

    const content = <p className={`${headerClasses} ${tooltip && !isMobile ? 'cursor-help' : ''} transition-all duration-300 ease-out`}>{section.label}</p>;

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
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 pb-12 bg-bg">
        {sortedSections.map((section) => {
          // Skip categories section - render separately
          if (section.key === 'categories') {
            if (!featureFlags['lifeAreasEnabled'] || lifeAreas.length === 0) return null;

            return (
              <div key={section.key} className="pt-4">
                <button
                  onClick={() => setMobileLifeAreasExpanded(!mobileLifeAreasExpanded)}
                  className="w-full flex items-center gap-1 px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 hover:text-text transition-colors"
                  aria-label={mobileLifeAreasExpanded ? "Collapse Categories" : "Expand Categories"}
                  aria-expanded={mobileLifeAreasExpanded}
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
                    aria-label={`View ${la.name}`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: la.color }} />
                    <span className="text-sm font-medium truncate">{la.name}</span>
                  </button>
                ))}
              </div>
            );
          }

          // Handle beta section with collapse
          if (section.key === 'beta') {
            if (!hasBetaItems) return null;

            const betaItems = getItemsBySection('beta');
            return (
              <div key={section.key} className="pt-4">
                <button
                  onClick={() => setMobileBetaExpanded(!mobileBetaExpanded)}
                  className="w-full flex items-center gap-1 px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 hover:text-text transition-colors"
                  aria-label={mobileBetaExpanded ? "Collapse Beta" : "Expand Beta"}
                  aria-expanded={mobileBetaExpanded}
                >
                  {mobileBetaExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Beta
                </button>

                {mobileBetaExpanded && betaItems.map((item) => renderNavItem(item, true))}
              </div>
            );
          }

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
          fixed top-0 left-0 h-full z-50
          transform transition-all duration-300 ease-out
          lg:relative lg:translate-x-0 lg:z-0
          flex flex-col
          group
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-16' : isV2 ? 'sidebar-v2-width' : 'w-64'}
          ${isV2 ? 'sidebar-v2' : 'bg-panel glass border-r border-border'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden flex-shrink-0">
          <span className="font-semibold text-text">Menu</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* V2 Desktop header with logo - hidden on mobile and when collapsed */}
        {isV2 && !isCollapsed && (
          <div className="sidebar-v2-header hidden lg:flex">
            <div className="sidebar-v2-logo">m</div>
            <span className="sidebar-v2-title">myBrain</span>
          </div>
        )}

        {/* V2 Quick Actions section - only shown on desktop when not collapsed */}
        {isV2 && !isCollapsed && (
          <div className="sidebar-v2-section hidden lg:block">
            <h3 className="sidebar-v2-section-title">QUICK ACTIONS</h3>
            <div className="sidebar-v2-quick-actions">
              <QuickActionButton variant="primary" icon={<Plus size={14} />} onClick={handleNewTask}>
                Task
              </QuickActionButton>
              <QuickActionButton variant="primary" icon={<Plus size={14} />} onClick={handleNewNote}>
                Note
              </QuickActionButton>
              <QuickActionButton variant="secondary" icon={<Plus size={14} />} onClick={handleNewEvent}>
                Event
              </QuickActionButton>
              <QuickActionButton variant="secondary" icon={<FileUp size={14} />} onClick={handleNewFile}>
                File
              </QuickActionButton>
              <QuickActionButton variant="gradient" icon={<Zap size={14} />} fullWidth onClick={handleQuickCapture}>
                Quick Capture
              </QuickActionButton>
            </div>
          </div>
        )}

        {/* Edge toggle - appears on sidebar hover */}
        <div
          className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out hidden lg:block z-10"
        >
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-full bg-panel border border-border shadow-md hover:bg-bg hover:shadow-lg transition-all duration-200 ease-out min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto p-3 pb-12 ${isCollapsed ? 'px-2' : ''}`}>
          {/* V2 Navigate Section - Uses NavItem components directly */}
          {isV2 ? (
            <div className="flex flex-col gap-1">
              {/* NAVIGATE section header - hidden when collapsed */}
              {!isCollapsed && (
                <h3 className="sidebar-v2-section-title hidden lg:block mb-2">NAVIGATE</h3>
              )}
              {/* Navigation items list - 8 required items */}
              <ul className="nav-list list-none flex flex-col gap-0.5">
                {/* 1. Dashboard - Home icon, always first */}
                <li>
                  <NavItem
                    icon={<LayoutDashboard className="w-5 h-5" />}
                    label="Dashboard"
                    to="/app"
                    collapsed={isCollapsed}
                  />
                </li>
                {/* 2. Today - Calendar icon, badge for today's items count */}
                <li>
                  <NavItem
                    icon={<Calendar className="w-5 h-5" />}
                    label="Today"
                    to="/app/today"
                    badge={todayData?.tasks?.length || 0}
                    collapsed={isCollapsed}
                  />
                </li>
                {/* 3. Tasks - Checkmark icon, badge for pending tasks */}
                <li>
                  <NavItem
                    icon={<CheckSquare className="w-5 h-5" />}
                    label="Tasks"
                    to="/app/tasks"
                    badge={tasksData?.tasks?.length || 0}
                    collapsed={isCollapsed}
                  />
                </li>
                {/* 4. Notes - Document icon */}
                <li>
                  <NavItem
                    icon={<StickyNote className="w-5 h-5" />}
                    label="Notes"
                    to="/app/notes"
                    collapsed={isCollapsed}
                  />
                </li>
                {/* 5. Calendar - Calendar icon (feature flagged) */}
                {featureFlags['calendarEnabled'] && (
                  <li>
                    <NavItem
                      icon={<CalendarDays className="w-5 h-5" />}
                      label="Calendar"
                      to="/app/calendar"
                      collapsed={isCollapsed}
                    />
                  </li>
                )}
                {/* 6. Projects - Folder icon (feature flagged) */}
                {featureFlags['projectsEnabled'] && (
                  <li>
                    <NavItem
                      icon={<FolderKanban className="w-5 h-5" />}
                      label="Projects"
                      to="/app/projects"
                      collapsed={isCollapsed}
                    />
                  </li>
                )}
                {/* 7. Inbox - Tray icon, badge for unread count */}
                <li>
                  <NavItem
                    icon={<Inbox className="w-5 h-5" />}
                    label="Inbox"
                    to="/app/inbox"
                    badge={inboxCount || 0}
                    collapsed={isCollapsed}
                  />
                </li>
                {/* 8. Files - File icon (feature flagged) */}
                {featureFlags['filesEnabled'] && (
                  <li>
                    <NavItem
                      icon={<FolderOpen className="w-5 h-5" />}
                      label="Files"
                      to="/app/files"
                      collapsed={isCollapsed}
                    />
                  </li>
                )}
              </ul>

              {/* Favorites section */}
              <SidebarFavorites collapsed={isCollapsed} />

              {/* Projects section (expanded project list) */}
              <SidebarProjects collapsed={isCollapsed} />

              {/* Admin section - only for admins */}
              {isAdmin && (
                <div className="pt-4 flex flex-col gap-1">
                  {!isCollapsed && (
                    <h3 className="sidebar-v2-section-title hidden lg:block mb-2">ADMIN</h3>
                  )}
                  <ul className="nav-list list-none flex flex-col gap-0.5">
                    <li>
                      <NavItem
                        icon={<Shield className="w-5 h-5" />}
                        label="Admin Panel"
                        to="/admin"
                        collapsed={isCollapsed}
                      />
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
          /* Legacy V1 Navigation - Config-based rendering */
          <div className="flex flex-col gap-1">
          {sortedSections.map((section) => {
            // Handle main section (Dashboard) - no header, followed by Favorites
            if (section.key === 'main') {
              const mainItems = getItemsBySection('main');
              return (
                <div key={section.key} className="flex flex-col gap-1">
                  {mainItems.map((item) => renderNavItem(item))}
                  <SidebarFavorites collapsed={isCollapsed} />
                </div>
              );
            }

            // Handle working-memory section, followed by Projects sidebar
            if (section.key === 'working-memory') {
              const wmItems = getItemsBySection('working-memory');
              if (wmItems.length === 0) return null;
              return (
                <div key={section.key} className="pt-4 flex flex-col gap-1">
                  {renderSectionHeader(section)}
                  {wmItems.map((item) => renderNavItem(item))}
                  <SidebarProjects collapsed={isCollapsed} />
                </div>
              );
            }

            // Handle categories section separately (dynamic life areas)
            if (section.key === 'categories') {
              if (!featureFlags['lifeAreasEnabled'] || lifeAreas.length === 0) return null;

              // When collapsed, hide categories section entirely
              if (isCollapsed) return null;

              return (
                <div key={section.key} className="pt-4 flex flex-col gap-1">
                  {renderSectionHeader(section, false, true, lifeAreasExpanded, () => setLifeAreasExpanded(!lifeAreasExpanded))}

                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: lifeAreasExpanded ? `${(lifeAreas.length || 2) * 44 + 8}px` : '0px',
                      opacity: lifeAreasExpanded ? 1 : 0
                    }}
                  >
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
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ease-out ${
                            selectedLifeAreaId === la._id
                              ? 'bg-primary/10 text-primary'
                              : 'text-text hover:bg-bg hover:translate-x-0.5'
                          }`}
                          aria-label={`View ${la.name}`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform duration-300 ease-out hover:scale-110"
                            style={{ backgroundColor: la.color, boxShadow: `0 0 6px ${la.color}40` }}
                          />
                          <span className="text-sm font-medium truncate">{la.name}</span>
                          {la.isDefault && (
                            <span className="text-[10px] text-muted">(default)</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            }

            // Handle beta section with collapse
            if (section.key === 'beta') {
              if (!hasBetaItems) return null;

              // When collapsed, hide beta section entirely
              if (isCollapsed) return null;

              const betaItems = getItemsBySection('beta');
              return (
                <div key={section.key} className="pt-4 flex flex-col gap-1">
                  {renderSectionHeader(section, false, true, betaExpanded, () => setBetaExpanded(!betaExpanded))}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: betaExpanded ? `${betaItems.length * 44 + 8}px` : '0px',
                      opacity: betaExpanded ? 1 : 0
                    }}
                  >
                    {betaItems.map((item) => renderNavItem(item))}
                  </div>
                </div>
              );
            }

            // Skip admin section for non-admins
            if (section.key === 'admin' && !isAdmin) return null;

            const sectionItems = getItemsBySection(section.key);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section.key} className="pt-4 flex flex-col gap-1">
                {renderSectionHeader(section)}
                {sectionItems.map((item) => renderNavItem(item))}
              </div>
            );
          })}
          </div>
          )}
        </nav>

        {/* V2 Today's Progress section with Activity Rings - after navigation, desktop only */}
        {isV2 && !isCollapsed && (
          <div className="sidebar-v2-section hidden lg:block border-t border-[var(--v2-separator)]">
            <h3 className="sidebar-v2-section-title">TODAY'S PROGRESS</h3>
            <div className="sidebar-activity-rings-container">
              <ActivityRings
                fitness={todayProgress.fitness}
                health={todayProgress.health}
                focus={todayProgress.focus}
                size="md"
                showLabels
                loading={dashboardLoading}
              />
            </div>
          </div>
        )}

        {/* V2 Streak Banner - after Activity Rings, desktop only, when streak exists */}
        {isV2 && !isCollapsed && streakCount > 0 && (
          <div className="hidden lg:block px-4 pb-3">
            <StreakBanner count={streakCount} loading={dashboardLoading} />
          </div>
        )}

        {/* Footer with version */}
        <div className={`flex-shrink-0 border-t border-border transition-all duration-300 ease-out ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {/* Version - fade out when collapsed */}
          <p
            className="text-xs text-muted/50 text-center whitespace-nowrap overflow-hidden transition-all duration-300 ease-out"
            style={{
              opacity: isCollapsed ? 0 : 1,
              maxHeight: isCollapsed ? '0px' : '24px'
            }}
          >
            myBrain v0.1.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
