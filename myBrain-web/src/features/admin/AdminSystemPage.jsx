import { useState, useEffect, useRef, useCallback } from 'react';
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
  User,
  Shield,
  X,
  Plus,
  Save
} from 'lucide-react';
import {
  useKillSwitches,
  useToggleKillSwitch,
  useRateLimitConfig,
  useUpdateRateLimitConfig,
  useAddToWhitelist,
  useRemoveFromWhitelist
} from './hooks/useAdminUsers';
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
    name: 'Categories',
    description: 'Organize items into meaningful areas of responsibility',
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

// Rate Limit Configuration Component
function RateLimitConfigSection() {
  const { data, isLoading, error } = useRateLimitConfig();
  const updateConfig = useUpdateRateLimitConfig();
  const addToWhitelist = useAddToWhitelist();
  const removeFromWhitelist = useRemoveFromWhitelist();

  const [formData, setFormData] = useState(null);
  const [newIP, setNewIP] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [ipError, setIpError] = useState('');

  // Refs for timeout cleanup
  const successTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  /**
   * Validates IP address format (IPv4 or IPv6)
   */
  const isValidIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;

    // IPv4 pattern
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 pattern (simplified - covers most cases)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    const trimmed = ip.trim();
    return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed);
  };

  // Helper to show success message with auto-dismiss
  const showSuccess = useCallback((message) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(message);
    successTimeoutRef.current = setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  // Helper to show error message with auto-dismiss
  const showError = useCallback((message) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(''), 5000);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Initialize form data when config loads (using useEffect to avoid render-time state updates)
  useEffect(() => {
    if (data?.config) {
      setFormData({
        enabled: data.config.enabled,
        windowMs: data.config.windowMs,
        maxAttempts: data.config.maxAttempts,
        alertThreshold: data.config.alertThreshold,
        alertWindowMs: data.config.alertWindowMs,
        trustedIPs: data.config.trustedIPs || []
      });
    }
  }, [data?.config]);

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formData);
      showSuccess('Rate limit configuration saved');
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to save configuration');
    }
  };

  const handleAddIP = async () => {
    const trimmedIP = newIP.trim();

    if (!trimmedIP) {
      setIpError('IP address is required');
      return;
    }

    if (!isValidIP(trimmedIP)) {
      setIpError('Please enter a valid IPv4 or IPv6 address');
      return;
    }

    if (formData.trustedIPs?.includes(trimmedIP)) {
      setIpError('This IP is already in the whitelist');
      return;
    }

    setIpError('');

    try {
      await addToWhitelist.mutateAsync({ ip: trimmedIP, resolveEvents: true });
      setFormData(prev => ({
        ...prev,
        trustedIPs: [...(prev.trustedIPs || []), trimmedIP]
      }));
      setNewIP('');
      showSuccess(`IP ${trimmedIP} added to whitelist`);
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to add IP address');
    }
  };

  const handleRemoveIP = async (ip) => {
    try {
      await removeFromWhitelist.mutateAsync(ip);
      setFormData(prev => ({
        ...prev,
        trustedIPs: prev.trustedIPs.filter(i => i !== ip)
      }));
      showSuccess(`IP ${ip} removed from whitelist`);
    } catch (e) {
      showError(e.response?.data?.error || 'Failed to remove IP address');
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Failed to load rate limit configuration
      </div>
    );
  }

  if (!formData) return null;

  const hasChanges = data?.config && (
    formData.enabled !== data.config.enabled ||
    formData.windowMs !== data.config.windowMs ||
    formData.maxAttempts !== data.config.maxAttempts ||
    formData.alertThreshold !== data.config.alertThreshold ||
    formData.alertWindowMs !== data.config.alertWindowMs
  );

  return (
    <div className="space-y-4">
      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm">
          <Check className="w-4 h-4" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Enable/Disable toggle */}
      <div className="p-4 rounded-lg border border-border bg-panel">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-text">Rate Limiting</h4>
            <p className="text-xs text-muted mt-1">
              Protect against brute force login attempts
            </p>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
            aria-label={formData.enabled ? 'Disable rate limiting' : 'Enable rate limiting'}
            aria-pressed={formData.enabled}
            className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              formData.enabled
                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }`}
          >
            {formData.enabled ? <Power className="w-5 h-5" aria-hidden="true" /> : <PowerOff className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Configuration options */}
      <div className="p-4 rounded-lg border border-border bg-panel space-y-4">
        <h4 className="text-sm font-medium text-text">Rate Limit Settings</h4>

        {/* Note about server restart requirement */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Note:</strong> Changes to Time Window and Max Attempts currently require a server restart to take effect.
            Trusted IPs and Enable/Disable work immediately.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Time Window */}
          <div>
            <label htmlFor="rate-limit-window" className="block text-xs text-muted mb-1">Time Window</label>
            <select
              id="rate-limit-window"
              value={formData.windowMs}
              onChange={(e) => setFormData(prev => ({ ...prev, windowMs: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={300000}>5 minutes</option>
              <option value={600000}>10 minutes</option>
              <option value={900000}>15 minutes</option>
              <option value={1800000}>30 minutes</option>
              <option value={3600000}>1 hour</option>
            </select>
          </div>

          {/* Max Attempts */}
          <div>
            <label htmlFor="rate-limit-max-attempts" className="block text-xs text-muted mb-1">Max Attempts</label>
            <input
              id="rate-limit-max-attempts"
              type="number"
              min={1}
              max={100}
              value={formData.maxAttempts}
              onChange={(e) => setFormData(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Alert Threshold */}
          <div>
            <label htmlFor="rate-limit-alert-threshold" className="block text-xs text-muted mb-1">Alert Threshold</label>
            <input
              id="rate-limit-alert-threshold"
              type="number"
              min={1}
              max={100}
              value={formData.alertThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p id="rate-limit-alert-threshold-help" className="text-[10px] text-muted mt-1">Show alert after this many events</p>
          </div>

          {/* Alert Window */}
          <div>
            <label htmlFor="rate-limit-alert-window" className="block text-xs text-muted mb-1">Alert Window</label>
            <select
              id="rate-limit-alert-window"
              value={formData.alertWindowMs}
              onChange={(e) => setFormData(prev => ({ ...prev, alertWindowMs: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={900000}>15 minutes</option>
              <option value={1800000}>30 minutes</option>
              <option value={3600000}>1 hour</option>
              <option value={7200000}>2 hours</option>
            </select>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Trusted IPs */}
      <div className="p-4 rounded-lg border border-border bg-panel space-y-3">
        <h4 className="text-sm font-medium text-text">Trusted IPs (Whitelist)</h4>
        <p className="text-xs text-muted">
          These IPs bypass rate limiting. Use for admin access or known safe IPs.
        </p>

        {/* Add new IP */}
        <div>
          <label htmlFor="rate-limit-new-ip" className="sr-only">New IP address</label>
          <div className="flex gap-2">
            <input
              id="rate-limit-new-ip"
              type="text"
              value={newIP}
              onChange={(e) => {
                setNewIP(e.target.value);
                if (ipError) setIpError('');
              }}
              placeholder="Enter IP address..."
              aria-describedby={ipError ? 'ip-error' : undefined}
              aria-invalid={!!ipError}
              className={`flex-1 px-3 py-2 bg-bg border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                ipError ? 'border-red-500' : 'border-border'
              }`}
            />
            <button
              onClick={handleAddIP}
              disabled={!newIP.trim() || addToWhitelist.isPending}
              aria-label="Add IP to whitelist"
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {addToWhitelist.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              Add
            </button>
          </div>
          {ipError && (
            <p id="ip-error" className="text-xs text-red-500 mt-1">{ipError}</p>
          )}
        </div>

        {/* IP list */}
        {formData.trustedIPs?.length > 0 ? (
          <ul aria-label="Whitelisted IP addresses" className="space-y-2">
            {formData.trustedIPs.map((ip) => (
              <li
                key={ip}
                className="flex items-center justify-between px-3 py-2 bg-bg rounded-lg"
              >
                <span className="text-sm text-text font-mono">{ip}</span>
                <button
                  onClick={() => handleRemoveIP(ip)}
                  disabled={removeFromWhitelist.isPending}
                  aria-label={`Remove ${ip} from whitelist`}
                  className="p-1 text-muted hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted italic">No trusted IPs configured</p>
        )}
      </div>

      {/* Last updated */}
      {data?.config?.updatedAt && (
        <p className="text-xs text-muted text-center pt-2">
          Last updated: {new Date(data.config.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function AdminSystemPage() {
  const { data, isLoading, error, refetch } = useKillSwitches();
  const toggleKillSwitch = useToggleKillSwitch();
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('killSwitches'); // 'killSwitches' or 'rateLimit'

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
        {/* Settings Header with Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium text-text">System Settings</span>
            </div>
            <div className="flex gap-1 bg-bg rounded-lg p-1">
              <button
                onClick={() => setActiveTab('killSwitches')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === 'killSwitches'
                    ? 'bg-panel text-text'
                    : 'text-muted hover:text-text'
                }`}
              >
                Kill Switches
              </button>
              <button
                onClick={() => setActiveTab('rateLimit')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'rateLimit'
                    ? 'bg-panel text-text'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Rate Limiting
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'killSwitches' ? (
          <>
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

            {/* Kill Switches Content */}
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
          </>
        ) : (
          <RateLimitConfigSection />
        )}
      </div>
    </div>
  );
}
