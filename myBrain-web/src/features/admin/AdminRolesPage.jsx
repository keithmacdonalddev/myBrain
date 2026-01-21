import { useState, useEffect } from 'react';
import {
  User,
  Crown,
  ShieldCheck,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Infinity,
  HardDrive,
  FileText,
  CheckSquare,
  FolderKanban,
  Calendar,
  Image,
  Layers,
  ToggleLeft,
  ToggleRight,
  Gauge,
  Zap
} from 'lucide-react';
import AdminNav from './components/AdminNav';
import { useRoleConfigs, useRoleFeatures, useUpdateRoleConfig } from './hooks/useAdminUsers';

// Limit configuration
const LIMIT_CONFIGS = [
  { key: 'maxNotes', label: 'Notes', icon: FileText, description: 'Maximum number of notes' },
  { key: 'maxTasks', label: 'Tasks', icon: CheckSquare, description: 'Maximum number of tasks' },
  { key: 'maxProjects', label: 'Projects', icon: FolderKanban, description: 'Maximum number of projects' },
  { key: 'maxEvents', label: 'Events', icon: Calendar, description: 'Maximum number of calendar events' },
  { key: 'maxImages', label: 'Images', icon: Image, description: 'Maximum number of images' },
  { key: 'maxCategories', label: 'Categories', icon: Layers, description: 'Maximum number of categories' },
  { key: 'maxStorageBytes', label: 'Storage', icon: HardDrive, description: 'Maximum storage in bytes', isStorage: true }
];

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === -1) return 'Unlimited';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Parse storage input to bytes
function parseStorageToBytes(value, unit) {
  if (value === -1) return -1;
  const multipliers = {
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  return Math.floor(value * (multipliers[unit] || 1));
}

// Convert bytes to value and unit
function bytesToStorageValue(bytes) {
  if (bytes === -1) return { value: -1, unit: 'MB' };
  if (bytes >= 1024 * 1024 * 1024) {
    return { value: Math.round(bytes / (1024 * 1024 * 1024)), unit: 'GB' };
  }
  return { value: Math.round(bytes / (1024 * 1024)), unit: 'MB' };
}

// Role card component with both limits and features
function RoleCard({ role, config, allFeatures, onSave, isSaving, saveSuccess }) {
  const [editedLimits, setEditedLimits] = useState({});
  const [editedFeatures, setEditedFeatures] = useState({});
  const [storageUnit, setStorageUnit] = useState('MB');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('limits');

  // Initialize from config - ensure all features have a value
  useEffect(() => {
    if (config?.limits) {
      setEditedLimits(config.limits);
      const storage = bytesToStorageValue(config.limits.maxStorageBytes);
      setStorageUnit(storage.unit);
    }
    // Initialize features with all available feature keys
    // Use config values if they exist, otherwise default to false
    if (allFeatures?.length > 0) {
      const initialFeatures = {};
      allFeatures.forEach(({ key }) => {
        initialFeatures[key] = config?.features?.[key] ?? false;
      });
      setEditedFeatures(initialFeatures);
    }
  }, [config, allFeatures]);

  // Track changes
  useEffect(() => {
    if (!config) return;

    const limitsChanged = config.limits && Object.keys(editedLimits).some(
      key => editedLimits[key] !== config.limits[key]
    );

    // Compare each feature's current value against the config value (or false if not set)
    const featuresChanged = Object.keys(editedFeatures).some(key => {
      const currentValue = editedFeatures[key];
      const originalValue = config.features?.[key] ?? false;
      return currentValue !== originalValue;
    });

    setHasChanges(limitsChanged || featuresChanged);
  }, [editedLimits, editedFeatures, config]);

  const handleLimitChange = (key, value) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (key === 'maxStorageBytes') {
      setEditedLimits(prev => ({
        ...prev,
        [key]: parseStorageToBytes(numValue, storageUnit)
      }));
    } else {
      setEditedLimits(prev => ({
        ...prev,
        [key]: isNaN(numValue) ? 0 : numValue
      }));
    }
  };

  const handleUnlimitedToggle = (key) => {
    setEditedLimits(prev => ({
      ...prev,
      [key]: prev[key] === -1 ? (key === 'maxStorageBytes' ? 50 * 1024 * 1024 : 100) : -1
    }));
  };

  const handleStorageUnitChange = (newUnit) => {
    setStorageUnit(newUnit);
  };

  const handleFeatureToggle = (featureKey) => {
    setEditedFeatures(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey]
    }));
  };

  const handleSave = () => {
    onSave(role, editedLimits, editedFeatures);
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin': return <ShieldCheck className="w-5 h-5" />;
      case 'premium': return <Crown className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'admin': return 'purple';
      case 'premium': return 'amber';
      default: return 'blue';
    }
  };

  const color = getRoleColor();

  const getDisplayValue = (key) => {
    const value = editedLimits[key];
    if (value === -1) return '';
    if (key === 'maxStorageBytes') {
      const storage = bytesToStorageValue(value);
      return storage.value;
    }
    return value;
  };

  // Group features by category
  const groupedFeatures = allFeatures?.reduce((acc, feature) => {
    const cat = feature.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {}) || {};

  const categoryLabels = {
    optional: 'Optional Features',
    beta: 'Beta Features',
    enhanced: 'Enhanced Features',
    other: 'Other Features'
  };

  return (
    <div className="bg-panel border border-border rounded-lg shadow-theme-card overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b border-border bg-${color}-500/10`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-500`}>
            {getRoleIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text capitalize">{role}</h3>
            <p className="text-xs text-muted">
              {role === 'free' && 'Default settings for free users'}
              {role === 'premium' && 'Settings for premium subscribers'}
              {role === 'admin' && 'Settings for administrators'}
            </p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSection('limits')}
          className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeSection === 'limits'
              ? 'text-primary border-b-2 border-primary bg-bg/50'
              : 'text-muted hover:text-text'
          }`}
        >
          <Gauge className="w-4 h-4" />
          Limits
        </button>
        <button
          onClick={() => setActiveSection('features')}
          className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeSection === 'features'
              ? 'text-primary border-b-2 border-primary bg-bg/50'
              : 'text-muted hover:text-text'
          }`}
        >
          <Zap className="w-4 h-4" />
          Features
        </button>
      </div>

      {/* Limits Section */}
      {activeSection === 'limits' && (
        <div className="p-4 space-y-4 max-h-[400px] overflow-auto">
          {LIMIT_CONFIGS.map(({ key, label, icon: Icon, description, isStorage }) => {
            const isUnlimited = editedLimits[key] === -1;

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted" />
                    <span className="text-sm font-medium text-text">{label}</span>
                  </div>
                  <button
                    onClick={() => handleUnlimitedToggle(key)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                      isUnlimited
                        ? 'bg-primary/10 text-primary'
                        : 'bg-bg text-muted hover:text-text'
                    }`}
                  >
                    <Infinity className="w-3 h-3" />
                    {isUnlimited ? 'Unlimited' : 'Set unlimited'}
                  </button>
                </div>

                {!isUnlimited && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={getDisplayValue(key)}
                      onChange={(e) => handleLimitChange(key, e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={isStorage ? 'Storage amount' : 'Limit'}
                    />
                    {isStorage && (
                      <select
                        value={storageUnit}
                        onChange={(e) => handleStorageUnitChange(e.target.value)}
                        className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                      </select>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted">{description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Features Section */}
      {activeSection === 'features' && (
        <div className="p-4 space-y-4 max-h-[400px] overflow-auto">
          {Object.entries(groupedFeatures).map(([category, features]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                {categoryLabels[category] || category}
              </h4>
              <div className="space-y-2">
                {features.map(({ key, label, description }) => {
                  const isEnabled = editedFeatures[key] ?? false;

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-bg rounded-lg"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-sm font-medium text-text">{label}</span>
                        <p className="text-xs text-muted truncate">{description}</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle(key)}
                        className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                          isEnabled ? 'bg-primary' : 'bg-border'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            isEnabled ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border bg-bg/50">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            hasChanges
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-bg text-muted cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AdminRolesPage() {
  const { data, isLoading, error, refetch } = useRoleConfigs();
  const { data: featuresData } = useRoleFeatures();
  const updateRoleConfig = useUpdateRoleConfig();
  const [saveSuccess, setSaveSuccess] = useState({});

  const handleSaveRole = async (role, limits, features) => {
    try {
      await updateRoleConfig.mutateAsync({ role, limits, features });
      setSaveSuccess(prev => ({ ...prev, [role]: true }));
      setTimeout(() => {
        setSaveSuccess(prev => ({ ...prev, [role]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to save role config:', err);
    }
  };

  // Get config by role
  const getConfig = (role) => {
    return data?.roles?.find(r => r._id === role);
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <AdminNav />

      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text">Roles & Limits</h2>
        <p className="text-sm text-muted mt-1">
          Configure default limits and feature access for each user role. Changes apply to all users with that role.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Failed to load role configurations</span>
          </div>
          <p className="text-sm text-red-400 mt-1">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-panel border border-border rounded-lg shadow-theme-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="h-6 w-24 bg-bg rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <div key={j} className="h-12 bg-bg rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['free', 'premium', 'admin'].map((role) => (
            <RoleCard
              key={role}
              role={role}
              config={getConfig(role)}
              allFeatures={featuresData?.features || []}
              onSave={handleSaveRole}
              isSaving={updateRoleConfig.isPending}
              saveSuccess={saveSuccess[role]}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h4 className="text-sm font-medium text-blue-400 mb-2">About Role Configuration</h4>
        <ul className="text-sm text-blue-300/80 space-y-1">
          <li><strong>Limits:</strong> Set resource limits per role. Use -1 for unlimited.</li>
          <li><strong>Features:</strong> Enable/disable features globally for each role.</li>
          <li>Changes apply immediately to all users with that role.</li>
          <li>Individual user overrides (flags) take precedence over role defaults.</li>
          <li>When a user changes role, their feature access updates automatically.</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminRolesPage;
