import { useEffect, useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Dumbbell,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { fetchLifeAreas, selectActiveLifeAreas, selectLifeAreasLoading, selectLifeArea, selectSelectedLifeAreaId, clearSelectedLifeArea } from '../../store/lifeAreasSlice';
import { useInboxCount } from '../../features/notes/hooks/useNotes';
import { useFeatureFlags } from '../../hooks/useFeatureFlag';
import Tooltip from '../ui/Tooltip';

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
  const { user } = useSelector((state) => state.auth);
  const { data: inboxCount } = useInboxCount();

  // Life areas state
  const lifeAreas = useSelector(selectActiveLifeAreas);
  const lifeAreasLoading = useSelector(selectLifeAreasLoading);
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const [lifeAreasExpanded, setLifeAreasExpanded] = useState(true);

  useEffect(() => {
    dispatch(fetchLifeAreas());
  }, [dispatch]);

  const isAdmin = user?.role === 'admin';

  // Feature flags for optional and beta features
  const featureFlags = useFeatureFlags([
    // Optional features
    'calendar.enabled',
    'images.enabled',
    'projects.enabled',
    'lifeAreas.enabled',
    // Beta features
    'fitness.enabled',
    'kb.enabled',
    'messages.enabled'
  ]);
  const hasBetaFeatures = featureFlags['fitness.enabled'] || featureFlags['kb.enabled'] || featureFlags['messages.enabled'];

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

            {/* Calendar - optional feature */}
            {featureFlags['calendar.enabled'] && (
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
            )}

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

            {/* Images - optional feature */}
            {featureFlags['images.enabled'] && (
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
            )}

            {/* Projects - optional feature */}
            {featureFlags['projects.enabled'] && (
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
            )}
          </div>

          {/* Life Areas section - optional feature */}
          {featureFlags['lifeAreas.enabled'] && lifeAreas.length > 0 && (
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

          {/* Beta Features section - only shown if user has any beta flags enabled */}
          {hasBetaFeatures && (
            <div className="pt-4">
              <Tooltip
                content="Features in beta testing. Enable more in Admin > Users > Feature Flags."
                position="right"
                delay={500}
              >
                <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2 cursor-help">
                  Beta Features
                </p>
              </Tooltip>

              {featureFlags['fitness.enabled'] && (
                <NavLink
                  to="/app/fitness"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive || location.pathname.startsWith('/app/fitness')
                        ? 'bg-primary/10 text-primary'
                        : 'text-text hover:bg-bg'
                    }`
                  }
                >
                  <Dumbbell className="w-5 h-5" />
                  <span className="text-sm font-medium">Fitness</span>
                </NavLink>
              )}

              {featureFlags['kb.enabled'] && (
                <NavLink
                  to="/app/kb"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive || location.pathname.startsWith('/app/kb')
                        ? 'bg-primary/10 text-primary'
                        : 'text-text hover:bg-bg'
                    }`
                  }
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Knowledge Base</span>
                </NavLink>
              )}

              {featureFlags['messages.enabled'] && (
                <NavLink
                  to="/app/messages"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive || location.pathname.startsWith('/app/messages')
                        ? 'bg-primary/10 text-primary'
                        : 'text-text hover:bg-bg'
                    }`
                  }
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm font-medium">Messages</span>
                </NavLink>
              )}
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
