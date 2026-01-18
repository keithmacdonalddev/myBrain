import { useState, useEffect } from 'react';
import {
  FileText,
  CheckSquare,
  FolderKanban,
  Calendar,
  Image,
  HardDrive,
  Layers,
  Infinity,
  Save,
  Loader2,
  Check,
  X,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useUserLimits, useUpdateUserLimits } from '../hooks/useAdminUsers';

// Limit configuration
const LIMIT_CONFIGS = [
  { key: 'maxNotes', usageKey: 'notes', label: 'Notes', icon: FileText },
  { key: 'maxTasks', usageKey: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'maxProjects', usageKey: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'maxEvents', usageKey: 'events', label: 'Events', icon: Calendar },
  { key: 'maxImages', usageKey: 'images', label: 'Images', icon: Image },
  { key: 'maxCategories', usageKey: 'categories', label: 'Categories', icon: Layers }
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

// Progress bar component
function UsageBar({ current, max, color = 'primary' }) {
  const percentage = max === -1 ? 0 : Math.min(100, Math.round((current / max) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : `bg-${color}`;

  return (
    <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${barColor}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Limit row component
function LimitRow({ config, usage, roleDefault, userOverride, effectiveLimit, onOverrideChange, onClearOverride }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const hasOverride = userOverride !== undefined && userOverride !== null;
  const isUnlimited = effectiveLimit === -1;
  const current = usage || 0;

  const handleEdit = () => {
    setEditValue(hasOverride ? userOverride.toString() : '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const value = editValue === '' || editValue === '-1' ? -1 : parseInt(editValue, 10);
    onOverrideChange(config.key, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleSetUnlimited = () => {
    onOverrideChange(config.key, -1);
    setIsEditing(false);
  };

  const Icon = config.icon;

  return (
    <div className="p-4 border-b border-border last:border-b-0">
      <div className="flex items-start gap-4">
        {/* Icon and Label */}
        <div className="flex-shrink-0 p-2 bg-bg rounded-lg">
          <Icon className="w-5 h-5 text-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-text">{config.label}</span>
            <div className="flex items-center gap-2">
              {hasOverride && (
                <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  Override
                </span>
              )}
              <span className={`text-sm ${isUnlimited ? 'text-muted' : 'text-text'}`}>
                {current} / {isUnlimited ? <Infinity className="w-4 h-4 inline" /> : effectiveLimit}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {!isUnlimited && (
            <div className="mb-3">
              <UsageBar current={current} max={effectiveLimit} />
            </div>
          )}

          {/* Details */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-muted">
              <span>
                Role default: {roleDefault === -1 ? 'Unlimited' : roleDefault}
              </span>
              {hasOverride && (
                <span className="text-primary">
                  Override: {userOverride === -1 ? 'Unlimited' : userOverride}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="-1 for unlimited"
                    className="w-24 px-2 py-1 text-xs bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSetUnlimited}
                    className="p-1 text-muted hover:text-text"
                    title="Set unlimited"
                  >
                    <Infinity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1 text-green-500 hover:text-green-400"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-1 text-red-500 hover:text-red-400"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-2 py-1 text-xs text-muted hover:text-text hover:bg-bg rounded"
                  >
                    {hasOverride ? 'Edit' : 'Set Override'}
                  </button>
                  {hasOverride && (
                    <button
                      onClick={() => onClearOverride(config.key)}
                      className="p-1 text-muted hover:text-text"
                      title="Clear override"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Storage limit row (special handling for bytes)
function StorageLimitRow({ usage, roleDefault, userOverride, effectiveLimit, onOverrideChange, onClearOverride }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState('MB');
  const hasOverride = userOverride !== undefined && userOverride !== null;
  const isUnlimited = effectiveLimit === -1;
  const current = usage || 0;

  const handleEdit = () => {
    if (hasOverride && userOverride !== -1) {
      const mb = Math.round(userOverride / (1024 * 1024));
      setEditValue(mb.toString());
      setEditUnit('MB');
    } else {
      setEditValue('');
      setEditUnit('MB');
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue === '' || editValue === '-1') {
      onOverrideChange('maxStorageBytes', -1);
    } else {
      const multiplier = editUnit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024;
      const bytes = parseInt(editValue, 10) * multiplier;
      onOverrideChange('maxStorageBytes', bytes);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSetUnlimited = () => {
    onOverrideChange('maxStorageBytes', -1);
    setIsEditing(false);
  };

  return (
    <div className="p-4 border-b border-border last:border-b-0">
      <div className="flex items-start gap-4">
        {/* Icon and Label */}
        <div className="flex-shrink-0 p-2 bg-bg rounded-lg">
          <HardDrive className="w-5 h-5 text-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-text">Storage</span>
            <div className="flex items-center gap-2">
              {hasOverride && (
                <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  Override
                </span>
              )}
              <span className={`text-sm ${isUnlimited ? 'text-muted' : 'text-text'}`}>
                {formatBytes(current)} / {isUnlimited ? <Infinity className="w-4 h-4 inline" /> : formatBytes(effectiveLimit)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {!isUnlimited && (
            <div className="mb-3">
              <UsageBar current={current} max={effectiveLimit} />
            </div>
          )}

          {/* Details */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-muted">
              <span>
                Role default: {roleDefault === -1 ? 'Unlimited' : formatBytes(roleDefault)}
              </span>
              {hasOverride && (
                <span className="text-primary">
                  Override: {userOverride === -1 ? 'Unlimited' : formatBytes(userOverride)}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Amount"
                    className="w-20 px-2 py-1 text-xs bg-bg border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
                    autoFocus
                  />
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="px-2 py-1 text-xs bg-bg border border-border rounded text-text focus:outline-none"
                  >
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                  </select>
                  <button
                    onClick={handleSetUnlimited}
                    className="p-1 text-muted hover:text-text"
                    title="Set unlimited"
                  >
                    <Infinity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1 text-green-500 hover:text-green-400"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-1 text-red-500 hover:text-red-400"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-2 py-1 text-xs text-muted hover:text-text hover:bg-bg rounded"
                  >
                    {hasOverride ? 'Edit' : 'Set Override'}
                  </button>
                  {hasOverride && (
                    <button
                      onClick={() => onClearOverride('maxStorageBytes')}
                      className="p-1 text-muted hover:text-text"
                      title="Clear override"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserLimitsTab({ user }) {
  const { data: limitData, isLoading, error, refetch } = useUserLimits(user._id);
  const updateLimits = useUpdateUserLimits();
  const [pendingChanges, setPendingChanges] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleOverrideChange = (key, value) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleClearOverride = (key) => {
    setPendingChanges(prev => ({ ...prev, [key]: null }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    try {
      await updateLimits.mutateAsync({
        userId: user._id,
        limits: pendingChanges
      });
      setPendingChanges({});
      setSuccessMessage('Limits updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      refetch();
    } catch (err) {
      console.error('Failed to update limits:', err);
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Get effective values considering pending changes
  const getEffectiveOverride = (key) => {
    if (key in pendingChanges) {
      return pendingChanges[key];
    }
    return limitData?.userOverrides?.[key];
  };

  const getEffectiveLimit = (key) => {
    const override = getEffectiveOverride(key);
    if (override !== undefined && override !== null) {
      return override;
    }
    return limitData?.roleDefaults?.[key] ?? -1;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-muted animate-spin mx-auto mb-4" />
        <p className="text-muted">Loading limits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-2">Failed to load limits</p>
        <p className="text-sm text-muted mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 text-sm bg-bg border border-border rounded-lg hover:bg-panel"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Success message */}
      {successMessage && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 p-4 bg-bg rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-medium text-text">User Role: {user.role}</h4>
            <p className="text-xs text-muted mt-1">
              Role defaults apply unless overridden
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSaveChanges}
              disabled={updateLimits.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
            >
              {updateLimits.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          {LIMIT_CONFIGS.slice(0, 4).map(config => {
            const current = limitData?.usage?.[config.usageKey] || 0;
            const max = getEffectiveLimit(config.key);
            const percentage = max === -1 ? 0 : Math.round((current / max) * 100);

            return (
              <div key={config.key} className="text-center">
                <div className="text-lg font-semibold text-text">{current}</div>
                <div className="text-xs text-muted">{config.label}</div>
                {max !== -1 && (
                  <div className="text-xs text-muted">{percentage}% used</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Limits List */}
      <div className="bg-panel border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-bg/50">
          <h4 className="text-sm font-medium text-text">Limit Configuration</h4>
        </div>

        {/* Regular limits */}
        {LIMIT_CONFIGS.map(config => (
          <LimitRow
            key={config.key}
            config={config}
            usage={limitData?.usage?.[config.usageKey]}
            roleDefault={limitData?.roleDefaults?.[config.key]}
            userOverride={getEffectiveOverride(config.key)}
            effectiveLimit={getEffectiveLimit(config.key)}
            onOverrideChange={handleOverrideChange}
            onClearOverride={handleClearOverride}
          />
        ))}

        {/* Storage limit */}
        <StorageLimitRow
          usage={limitData?.usage?.storageBytes}
          roleDefault={limitData?.roleDefaults?.maxStorageBytes}
          userOverride={getEffectiveOverride('maxStorageBytes')}
          effectiveLimit={getEffectiveLimit('maxStorageBytes')}
          onOverrideChange={handleOverrideChange}
          onClearOverride={handleClearOverride}
        />
      </div>

      {/* Help text */}
      <div className="mt-4 text-xs text-muted">
        <p>Overrides take precedence over role defaults. Click &quot;Set Override&quot; to customize limits for this user.</p>
        <p className="mt-1">Use -1 or click the infinity icon to set unlimited.</p>
      </div>
    </div>
  );
}

export default UserLimitsTab;
