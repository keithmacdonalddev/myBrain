import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

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
    { path: '/admin', label: 'Needs Attention', badge: badgeCount },
    { path: '/admin/users', label: 'All Users' },
    { path: '/admin/logs', label: 'Logs' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/settings', label: 'Settings' },
  ];

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Admin</h1>
          <p className="text-sm text-muted">myBrain Platform</p>
        </div>
        {onRefresh && (
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 mb-8 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(tab.path)
                ? 'text-text bg-bg'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

export default AdminNav;
