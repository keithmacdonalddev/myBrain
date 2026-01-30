/**
 * ActivityPage Component
 *
 * Main activity page with tabbed navigation for:
 * - Overview: Current session, stats, recent alerts
 * - Sessions: Active sessions management
 * - Login History: Past login attempts
 * - Security Alerts: Security notifications
 * - Timeline: Full activity history
 * - Export: Download activity data
 */
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  LogIn,
  ShieldAlert,
  Activity,
  Download,
} from 'lucide-react';
import TabNav from '../../components/ui/TabNav';
import { useSecurityAlerts } from './hooks/useSecurityAlerts';

// Tab content components (lazy imported for code splitting could be added later)
import ActivityOverview from './components/ActivityOverview';
import SessionsList from './components/SessionsList';
import LoginHistory from './components/LoginHistory';
import SecurityAlerts from './components/SecurityAlerts';
import ActivityTimeline from './components/ActivityTimeline';
import ActivityExport from './components/ActivityExport';

/**
 * Activity & Security page with tabbed navigation
 */
export default function ActivityPage() {
  // Use URL params to persist tab state
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Fetch alerts to show count badge
  const { data: alertsData } = useSecurityAlerts();
  const unreadCount = alertsData?.unreadCount || 0;

  // Tab configuration with icons and optional counts
  // Note: TabNav uses 'count' not 'badge' per the component API
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'logins', label: 'Login History', icon: LogIn },
    {
      id: 'alerts',
      label: 'Security Alerts',
      icon: ShieldAlert,
      count: unreadCount > 0 ? unreadCount : null,
    },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'export', label: 'Export', icon: Download },
  ];

  // Handle tab change - update URL param
  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ActivityOverview />;
      case 'sessions':
        return <SessionsList />;
      case 'logins':
        return <LoginHistory />;
      case 'alerts':
        return <SecurityAlerts />;
      case 'timeline':
        return <ActivityTimeline />;
      case 'export':
        return <ActivityExport />;
      default:
        return <ActivityOverview />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-text">Activity & Security</h1>
        <p className="text-muted mt-1">
          Monitor your account activity, manage sessions, and review security alerts
        </p>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto -mx-6 px-6">
        <TabNav
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          variant="underline"
        />
      </div>

      {/* Tab content */}
      <div className="mt-6">{renderTabContent()}</div>
    </div>
  );
}
