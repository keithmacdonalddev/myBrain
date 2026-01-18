import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import {
  StickyNote,
  Dumbbell,
  BookOpen,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Shield,
  X,
  Folder,
  Lock,
  Clock,
  Calendar,
  CalendarDays,
  Inbox,
  CheckSquare,
  Image,
  FolderKanban,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { fetchAreas, selectAreas, selectAreasLoading } from '../../store/areasSlice';
import { fetchLifeAreas, selectActiveLifeAreas, selectLifeAreasLoading, selectLifeArea, selectSelectedLifeAreaId, clearSelectedLifeArea } from '../../store/lifeAreasSlice';
import { useInboxCount } from '../../features/notes/hooks/useNotes';
import Tooltip from '../ui/Tooltip';
import { useState } from 'react';

// Icon mapping
const iconMap = {
  StickyNote,
  Dumbbell,
  BookOpen,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Shield,
  Folder,
};

function getIcon(iconName) {
  return iconMap[iconName] || Folder;
}

// Coming Soon Nav Item with enhanced visual feedback
function ComingSoonNavItem({ area }) {
  const Icon = getIcon(area.icon);

  return (
    <Tooltip
      content={`${area.name} is coming soon! We're working on bringing this feature to you.`}
      position="right"
      delay={200}
    >
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted/60 cursor-not-allowed select-none group"
        role="button"
        aria-disabled="true"
        tabIndex={-1}
      >
        <div className="relative">
          <Icon className="w-5 h-5 opacity-50" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-bg rounded-full flex items-center justify-center">
            <Lock className="w-2 h-2 text-muted/50" />
          </div>
        </div>
        <span className="text-sm font-medium flex-1">{area.name}</span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted/10 rounded text-[10px] uppercase tracking-wider text-muted/70">
          <Clock className="w-2.5 h-2.5" />
          Soon
        </div>
      </div>
    </Tooltip>
  );
}

// Active Nav Item
function ActiveNavItem({ area, onClose }) {
  const location = useLocation();
  const Icon = getIcon(area.icon);
  const path = `/app/${area.slug}`;

  return (
    <NavLink
      to={path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive || location.pathname.startsWith(path)
            ? 'bg-primary/10 text-primary'
            : 'text-text hover:bg-bg'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{area.name}</span>
    </NavLink>
  );
}

// Skeleton loading item
function NavItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-5 h-5 bg-border rounded animate-pulse" />
      <div className="h-4 w-20 bg-border rounded animate-pulse" />
    </div>
  );
}

function Sidebar({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const areas = useSelector(selectAreas);
  const isLoading = useSelector(selectAreasLoading);
  const { user } = useSelector((state) => state.auth);
  const { data: inboxCount } = useInboxCount();

  // Life areas state
  const lifeAreas = useSelector(selectActiveLifeAreas);
  const lifeAreasLoading = useSelector(selectLifeAreasLoading);
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const [lifeAreasExpanded, setLifeAreasExpanded] = useState(true);

  useEffect(() => {
    dispatch(fetchAreas());
    dispatch(fetchLifeAreas());
  }, [dispatch]);

  const isAdmin = user?.role === 'admin';

  // Separate active and coming soon areas
  // Filter out notes since we're adding it to the working memory section
  const activeAreas = areas.filter((a) => a.status !== 'coming_soon' && a.status !== 'hidden' && a.slug !== 'notes');
  const comingSoonAreas = areas.filter((a) => a.status === 'coming_soon');

  const handleLifeAreaClick = (lifeAreaId) => {
    if (selectedLifeAreaId === lifeAreaId) {
      dispatch(clearSelectedLifeArea());
    } else {
      dispatch(selectLifeArea(lifeAreaId));
    }
    onClose();
  };

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
          {/* Dashboard link */}
          <NavLink
            to="/app"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text hover:bg-bg'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </NavLink>

          {/* Working Memory section */}
          <div className="pt-4">
            <Tooltip
              content="Quick access to your active work: today's schedule, tasks, notes, and current projects."
              position="right"
              delay={500}
            >
              <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 cursor-help">
                Working Memory
              </p>
            </Tooltip>

            {/* Today */}
            <NavLink
              to="/app/today"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Today</span>
            </NavLink>

            {/* Calendar */}
            <NavLink
              to="/app/calendar"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive || location.pathname.startsWith('/app/calendar')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-sm font-medium">Calendar</span>
            </NavLink>

            {/* Inbox */}
            <NavLink
              to="/app/inbox"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <Inbox className="w-5 h-5" />
              <span className="text-sm font-medium flex-1">Inbox</span>
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded min-w-[1.25rem] text-center">
                  {inboxCount}
                </span>
              )}
            </NavLink>

            {/* Tasks */}
            <NavLink
              to="/app/tasks"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive || location.pathname.startsWith('/app/tasks')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <CheckSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Tasks</span>
            </NavLink>

            {/* Notes */}
            <NavLink
              to="/app/notes"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive || location.pathname.startsWith('/app/notes')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <StickyNote className="w-5 h-5" />
              <span className="text-sm font-medium">Notes</span>
            </NavLink>

            {/* Images */}
            <NavLink
              to="/app/images"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive || location.pathname.startsWith('/app/images')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <Image className="w-5 h-5" />
              <span className="text-sm font-medium">Images</span>
            </NavLink>

            {/* Projects */}
            <NavLink
              to="/app/projects"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive || location.pathname.startsWith('/app/projects')
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <FolderKanban className="w-5 h-5" />
              <span className="text-sm font-medium">Projects</span>
            </NavLink>
          </div>

          {/* Life Areas section */}
          {lifeAreas.length > 0 && (
            <div className="pt-4">
              <Tooltip
                content="Filter by life area. Life areas are ongoing responsibilities like Health, Career, or Finance."
                position="right"
                delay={500}
              >
                <button
                  onClick={() => setLifeAreasExpanded(!lifeAreasExpanded)}
                  className="w-full flex items-center gap-1 px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 hover:text-text transition-colors"
                >
                  {lifeAreasExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Life Areas
                </button>
              </Tooltip>

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
          )}

          {/* Other Areas section */}
          {activeAreas.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Areas
              </p>

              {isLoading ? (
                <>
                  <NavItemSkeleton />
                  <NavItemSkeleton />
                  <NavItemSkeleton />
                </>
              ) : (
                activeAreas.map((area) => (
                  <ActiveNavItem key={area.slug} area={area} onClose={onClose} />
                ))
              )}
            </div>
          )}

          {/* Coming Soon section - only if there are coming soon areas */}
          {!isLoading && comingSoonAreas.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-muted/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Coming Soon
              </p>

              {comingSoonAreas.map((area) => (
                <ComingSoonNavItem key={area.slug} area={area} />
              ))}
            </div>
          )}

          {/* Admin section */}
          {isAdmin && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Admin
              </p>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive || location.pathname.startsWith('/admin')
                      ? 'bg-primary/10 text-primary'
                      : 'text-text hover:bg-bg'
                  }`
                }
              >
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Admin Panel</span>
              </NavLink>
            </div>
          )}
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
