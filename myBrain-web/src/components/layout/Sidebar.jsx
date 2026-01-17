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
  Folder
} from 'lucide-react';
import { fetchAreas, selectAreas, selectAreasLoading } from '../../store/areasSlice';

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

function Sidebar({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const areas = useSelector(selectAreas);
  const isLoading = useSelector(selectAreasLoading);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchAreas());
  }, [dispatch]);

  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-panel border-r border-border z-50
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <span className="font-semibold text-text">Menu</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
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

          {/* Areas section */}
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Areas
            </p>

            {isLoading ? (
              <div className="px-3 py-2">
                <div className="h-4 w-24 bg-border rounded animate-pulse" />
              </div>
            ) : (
              areas.map((area) => {
                const Icon = getIcon(area.icon);
                const isComingSoon = area.status === 'coming_soon';
                const path = `/app/${area.slug}`;

                if (isComingSoon) {
                  return (
                    <div
                      key={area.slug}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted cursor-not-allowed opacity-60"
                      title="Coming Soon"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{area.name}</span>
                      <span className="ml-auto text-xs bg-border px-2 py-0.5 rounded">
                        Soon
                      </span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={area.slug}
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
              })
            )}
          </div>

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

          {/* Settings */}
          <div className="pt-4">
            <NavLink
              to="/app/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
