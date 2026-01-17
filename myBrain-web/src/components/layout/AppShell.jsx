import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { NotePanelProvider } from '../../contexts/NotePanelContext';
import NoteSlidePanel from '../notes/NoteSlidePanel';

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

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NotePanelProvider>
      <div className="h-screen flex flex-col bg-bg">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Note slide panel */}
        <NoteSlidePanel />
      </div>
    </NotePanelProvider>
  );
}

export default AppShell;
