import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';

function AdminNav({ onRefresh, isRefreshing, badgeCount }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const tabs = [
    { path: '/admin', label: 'Attention', mobileLabel: 'Attention', badge: badgeCount },
    { path: '/admin/reports', label: 'Reports', mobileLabel: 'Reports' },
    { path: '/admin/social', label: 'Social', mobileLabel: 'Social' },
    { path: '/admin/users', label: 'All Users', mobileLabel: 'Users' },
    { path: '/admin/roles', label: 'Roles & Limits', mobileLabel: 'Roles' },
    { path: '/admin/sidebar', label: 'Sidebar', mobileLabel: 'Sidebar' },
    { path: '/admin/logs', label: 'Logs', mobileLabel: 'Logs' },
    { path: '/admin/analytics', label: 'Analytics', mobileLabel: 'Stats' },
    { path: '/admin/database', label: 'Database', mobileLabel: 'DB' },
    { path: '/admin/settings', label: 'Settings', mobileLabel: 'Settings' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="sm:hidden flex items-center justify-between h-14 -mx-4 px-4 mb-4 border-b border-border">
        <Link
          to="/app"
          className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        {onRefresh ? (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden sm:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Admin</h1>
          <p className="text-sm text-muted">myBrain Platform</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </header>

      {/* Navigation Tabs - horizontally scrollable on mobile */}
      <nav className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-4 sm:mb-8 border-b border-border pb-3 sm:pb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                isActive(tab.path)
                  ? 'text-text bg-bg'
                  : 'text-muted hover:text-text active:bg-bg/50'
              }`}
            >
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="ml-1.5 sm:ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export default AdminNav;
