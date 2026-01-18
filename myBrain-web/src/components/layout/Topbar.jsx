import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, User, LogOut, Settings } from 'lucide-react';
import { logout } from '../../store/authSlice';
import Tooltip from '../ui/Tooltip';

// Helper to get display name from user object
function getDisplayName(user) {
  if (user?.profile?.displayName) return user.profile.displayName;
  if (user?.profile?.firstName) {
    return user.profile.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.profile.firstName;
  }
  return user?.email?.split('@')[0] || 'User';
}

function Topbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const displayName = getDisplayName(user);
  const isSettingsOpen = location.pathname === '/app/settings';

  const handleSettingsClick = () => {
    if (isSettingsOpen) {
      // Go back to dashboard when closing settings
      navigate('/app');
    } else {
      navigate('/app/settings');
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-14 flex-shrink-0 border-b border-border bg-panel flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-bg rounded-lg transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-muted" />
        </button>
        <h1 className="text-lg font-semibold text-text">myBrain</h1>
      </div>

      {/* Center - Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder:text-muted"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 hover:bg-bg rounded-lg transition-colors md:hidden"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-muted" />
        </button>

        {/* Settings button */}
        <Tooltip content={isSettingsOpen ? "Close Settings" : "Settings"} position="bottom">
          <button
            onClick={handleSettingsClick}
            className={`p-2 rounded-lg transition-all ${
              isSettingsOpen
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-bg text-muted'
            }`}
            aria-label={isSettingsOpen ? "Close Settings" : "Settings"}
          >
            <Settings className={`w-5 h-5 transition-transform duration-200 ${isSettingsOpen ? 'rotate-90' : ''}`} />
          </button>
        </Tooltip>

        {/* User dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 p-2 hover:bg-bg rounded-lg transition-colors">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:block text-sm text-text">
              {displayName}
            </span>
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-panel border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2 border-b border-border">
              <p className="text-sm font-medium text-text truncate">{displayName}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => navigate('/app/profile')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg rounded transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
