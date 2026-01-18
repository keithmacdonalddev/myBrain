import { useState } from 'react';
import {
  Settings,
  Power,
  PowerOff,
  RefreshCw,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  User
} from 'lucide-react';
import { useKillSwitches, useToggleKillSwitch } from './hooks/useAdminUsers';
import AdminNav from './components/AdminNav';

// Define available features that can be kill-switched
const FEATURES = [
  {
    key: 'calendarEnabled',
    name: 'Calendar',
    description: 'Event scheduling and calendar views',
    category: 'Core Features',
  },
  {
    key: 'projectsEnabled',
    name: 'Projects',
    description: 'Project management with linked items',
    category: 'Core Features',
  },
  {
    key: 'imagesEnabled',
    name: 'Images',
    description: 'Image gallery and media management',
    category: 'Core Features',
  },
  {
    key: 'weatherEnabled',
    name: 'Weather',
    description: 'Weather widget on dashboard',
    category: 'Core Features',
  },
  {
    key: 'lifeAreasEnabled',
    name: 'Life Areas',
    description: 'Categorize items by life area',
    category: 'Core Features',
  },
  {
    key: 'analyticsEnabled',
    name: 'Analytics',
    description: 'Usage analytics and insights',
    category: 'Core Features',
  },
  {
    key: 'fitnessEnabled',
    name: 'Fitness',
    description: 'Fitness and workout tracking',
    category: 'Beta Features',
  },
  {
    key: 'kbEnabled',
    name: 'Knowledge Base',
    description: 'Wiki and knowledge base feature',
    category: 'Beta Features',
  },
  {
    key: 'messagesEnabled',
    name: 'Messages',
    description: 'Messaging and notifications',
    category: 'Beta Features',
  },
];

function KillSwitchCard({ feature, killSwitch, onToggle, isLoading }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');

  const isEnabled = !killSwitch || killSwitch.enabled;

  const handleToggle = () => {
    if (isEnabled) {
      // Disabling - need confirmation and reason
      setShowConfirm(true);
    } else {
      // Enabling - just do it
      onToggle(feature.key, true, '');
    }
  };

  const confirmDisable = () => {
    if (!reason.trim()) return;
    onToggle(feature.key, false, reason);
    setShowConfirm(false);
    setReason('');
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`p-4 rounded-lg border ${
      isEnabled
        ? 'border-border bg-panel'
        : 'border-red-500/30 bg-red-500/5'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text">{feature.name}</h4>
            {!isEnabled && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/10 text-red-500">
                DISABLED
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">{feature.description}</p>

          {!isEnabled && killSwitch && (
            <div className="mt-3 space-y-1 text-xs">
              {killSwitch.reason && (
                <p className="text-red-400">
                  <span className="text-muted">Reason:</span> {killSwitch.reason}
                </p>
              )}
              <div className="flex items-center gap-3 text-muted">
                {killSwitch.disabledAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(killSwitch.disabledAt)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`p-2 rounded-lg transition-colors ${
            isEnabled
              ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
          } disabled:opacity-50`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isEnabled ? (
            <Power className="w-5 h-5" />
          ) : (
            <PowerOff className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-500 font-medium mb-2">
            Disable {feature.name}?
          </p>
          <p className="text-xs text-red-400 mb-3">
            This will prevent all users from accessing this feature until it is re-enabled.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for disabling..."
            rows={2}
            className="w-full px-3 py-2 bg-bg border border-red-500/30 rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowConfirm(false);
                setReason('');
              }}
              className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-bg"
            >
              Cancel
            </button>
            <button
              onClick={confirmDisable}
              disabled={!reason.trim() || isLoading}
              className="flex-1 px-3 py-1.5 text-xs text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <PowerOff className="w-3 h-3" />
              )}
              Disable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSystemPage() {
  const { data, isLoading, error, refetch } = useKillSwitches();
  const toggleKillSwitch = useToggleKillSwitch();
  const [successMessage, setSuccessMessage] = useState('');

  const killSwitches = data?.killSwitches || {};

  const handleToggle = async (feature, enabled, reason) => {
    try {
      await toggleKillSwitch.mutateAsync({ feature, enabled, reason });
      setSuccessMessage(enabled ? `${feature} has been enabled` : `${feature} has been disabled`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      // Error handled by mutation
    }
  };

  // Group features by category
  const categories = FEATURES.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  // Count disabled features
  const disabledCount = FEATURES.filter(f => killSwitches[f.key]?.enabled === false).length;

  return (
    <div className="px-6 py-8">
      <AdminNav />

      {/* System Settings Content */}
      <div className="flex flex-col">
        {/* Settings Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted" />
            <span className="text-sm font-medium text-text">Feature Kill Switches</span>
          </div>
        </div>

        {/* Status summary */}
        {disabledCount > 0 && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-500">
              {disabledCount} feature{disabledCount > 1 ? 's are' : ' is'} currently disabled
            </span>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-500/10 rounded-lg text-green-500 text-sm">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            Failed to load system settings
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info card */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-sm font-medium text-blue-500 mb-1">About Kill Switches</h3>
              <p className="text-xs text-blue-400">
                Kill switches allow you to globally disable features for all users. When a feature is
                disabled, users will see a "Feature unavailable" message. Admin users can still access
                disabled features for testing purposes.
              </p>
            </div>

            {/* Feature categories */}
            {Object.entries(categories).map(([category, features]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted mb-3">{category}</h3>
                <div className="grid gap-3">
                  {features.map((feature) => (
                    <KillSwitchCard
                      key={feature.key}
                      feature={feature}
                      killSwitch={killSwitches[feature.key]}
                      onToggle={handleToggle}
                      isLoading={toggleKillSwitch.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Last updated */}
            {data?.updatedAt && (
              <p className="text-xs text-muted text-center pt-4">
                Last updated: {new Date(data.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
