import { useState, Suspense, lazy } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Menu, Settings, Search, X } from 'lucide-react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { NotePanelProvider } from '../../contexts/NotePanelContext';
import { TaskPanelProvider } from '../../contexts/TaskPanelContext';
import NoteSlidePanel from '../notes/NoteSlidePanel';
import TaskSlidePanel from '../tasks/TaskSlidePanel';
import DefaultAvatar from '../ui/DefaultAvatar';

// Lazy load the pages for the mobile panels
const SettingsPage = lazy(() => import('../../features/settings/SettingsPage'));
const ProfilePage = lazy(() => import('../../features/profile/ProfilePage'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Full page panel for mobile (Menu, Settings, Profile)
function MobileFullPagePanel({ isOpen, onClose, title, children, hideHeader = false }) {
  return (
    <div
      className={`sm:hidden fixed inset-0 z-50 bg-bg transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {!hideHeader && (
        <>
          {/* Header with close button */}
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-text">{title}</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Content */}
          <div className="h-[calc(100%-56px)] overflow-auto">
            {isOpen && children}
          </div>
        </>
      )}

      {hideHeader && (
        <div className="h-full">
          {isOpen && children}
        </div>
      )}
    </div>
  );
}

// Mobile Menu Panel - wraps Sidebar content
function MobileMenuPanel({ isOpen, onClose }) {
  return (
    <div
      className={`sm:hidden fixed inset-0 z-50 bg-bg transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between h-14 px-4">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-text">Menu</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Sidebar content rendered inline */}
      {isOpen && (
        <div className="h-[calc(100%-56px)] overflow-auto">
          <Sidebar isOpen={true} onClose={onClose} isMobilePanel={true} />
        </div>
      )}
    </div>
  );
}

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

// Mobile Bottom Navigation
function MobileBottomNav({ onOpenPanel, activePanel }) {
  const { user } = useSelector((state) => state.auth);
  const displayName = getDisplayName(user);
  const [searchOpen, setSearchOpen] = useState(false);

  // Hide nav bar when a panel is open
  const isHidden = activePanel !== null;

  return (
    <div
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-panel border-t border-border transition-transform duration-300 ease-in-out ${
        isHidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Search bar - slides up/down */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          searchOpen ? 'max-h-[60px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text placeholder:text-muted"
            />
          </div>
        </div>
      </div>

      {/* Navigation icons - Caramilk bar style */}
      <div className="flex">
        <button
          onClick={() => onOpenPanel('menu')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-muted hover:text-text active:text-primary transition-colors"
          style={{
            boxShadow: 'inset 0 4px 6px -2px rgba(255,255,255,0.1), inset 0 -4px 6px -2px rgba(0,0,0,0.15), inset -1px 0 0 rgba(0,0,0,0.2)'
          }}
        >
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>

        {/* Groove divider */}
        <div
          className="w-[2px] self-stretch"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.25) 100%)',
            boxShadow: '1px 0 0 rgba(255,255,255,0.08)'
          }}
        />

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
            searchOpen ? 'text-primary' : 'text-muted hover:text-text active:text-primary'
          }`}
          style={{
            boxShadow: searchOpen
              ? 'inset 0 4px 8px -2px rgba(0,0,0,0.25), inset 0 -2px 4px -2px rgba(0,0,0,0.1)'
              : 'inset 0 4px 6px -2px rgba(255,255,255,0.1), inset 0 -4px 6px -2px rgba(0,0,0,0.15)'
          }}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-medium">Search</span>
        </button>

        {/* Groove divider */}
        <div
          className="w-[2px] self-stretch"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.25) 100%)',
            boxShadow: '1px 0 0 rgba(255,255,255,0.08)'
          }}
        />

        <button
          onClick={() => onOpenPanel('settings')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors text-muted hover:text-text active:text-primary"
          style={{
            boxShadow: 'inset 0 4px 6px -2px rgba(255,255,255,0.1), inset 0 -4px 6px -2px rgba(0,0,0,0.15)'
          }}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>

        {/* Groove divider */}
        <div
          className="w-[2px] self-stretch"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.25) 100%)',
            boxShadow: '1px 0 0 rgba(255,255,255,0.08)'
          }}
        />

        <button
          onClick={() => onOpenPanel('profile')}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors text-muted hover:text-text active:text-primary"
          style={{
            boxShadow: 'inset 0 4px 6px -2px rgba(255,255,255,0.1), inset 0 -4px 6px -2px rgba(0,0,0,0.15), inset 1px 0 0 rgba(0,0,0,0.2)'
          }}
        >
          <DefaultAvatar
            avatarUrl={user?.profile?.avatarUrl}
            defaultAvatarId={user?.profile?.defaultAvatarId}
            name={displayName}
            size="sm"
          />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'menu' | 'settings' | 'profile' | null

  const handleOpenPanel = (panel) => {
    setActivePanel(panel);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
  };

  return (
    <NotePanelProvider>
    <TaskPanelProvider>
      <div className="h-screen flex flex-col bg-bg">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content area - add bottom padding on mobile for nav bar */}
          <main className="flex-1 overflow-auto pb-[120px] sm:pb-0">
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav onOpenPanel={handleOpenPanel} activePanel={activePanel} />

        {/* Mobile full-page panels */}
        <MobileMenuPanel
          isOpen={activePanel === 'menu'}
          onClose={handleClosePanel}
        />

        <MobileFullPagePanel
          isOpen={activePanel === 'settings'}
          onClose={handleClosePanel}
          title="Settings"
          hideHeader
        >
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage onMobileClose={handleClosePanel} />
          </Suspense>
        </MobileFullPagePanel>

        <MobileFullPagePanel
          isOpen={activePanel === 'profile'}
          onClose={handleClosePanel}
          title="Profile"
          hideHeader
        >
          <Suspense fallback={<LoadingFallback />}>
            <ProfilePage onMobileClose={handleClosePanel} />
          </Suspense>
        </MobileFullPagePanel>

        {/* Note slide panel */}
        <NoteSlidePanel />
        {/* Task slide panel */}
        <TaskSlidePanel />
      </div>
    </TaskPanelProvider>
    </NotePanelProvider>
  );
}

export default AppShell;
