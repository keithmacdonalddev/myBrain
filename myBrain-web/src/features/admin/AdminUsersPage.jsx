import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  User,
  ShieldCheck,
  Crown,
  UserPlus,
  X,
  Check,
  AlertCircle,
  Flag,
  UserX,
  UserCheck,
  Loader2,
  Mail,
  Lock,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  MoreVertical,
  ChevronRight,
  Gauge
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import AdminNav from './components/AdminNav';
import UserContentTab from './components/UserContentTab';
import UserActivityTab from './components/UserActivityTab';
import UserModerationTab from './components/UserModerationTab';
import UserLimitsTab from './components/UserLimitsTab';
import DefaultAvatar from '../../components/ui/DefaultAvatar';
import { useRoleConfig, useRoleFeatures } from './hooks/useAdminUsers';

// Compact user row for the left panel
function UserListItem({ user, isSelected, onClick }) {
  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-500/10 text-purple-500">
          Admin
        </span>
      );
    }
    if (role === 'premium') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-500">
          Premium
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-500">
        Free
      </span>
    );
  };

  const getStatusBadge = (status, moderationStatus) => {
    if (status === 'suspended' || moderationStatus?.isSuspended) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-500/10 text-orange-500">
          Suspended
        </span>
      );
    }
    if (status === 'disabled') {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/10 text-red-500">
          Disabled
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-500/10 text-green-500">
        Active
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Online';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatJoinDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const getDisplayName = () => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return null;
  };

  const displayName = getDisplayName();
  const warningCount = user.moderationStatus?.warningCount || 0;

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-border cursor-pointer transition-colors min-h-[72px] active:bg-card ${
        isSelected
          ? 'bg-card border-l-2 border-l-primary'
          : 'hover:bg-card/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <DefaultAvatar
          avatarUrl={user.profile?.avatarUrl}
          defaultAvatarId={user.profile?.defaultAvatarId}
          name={displayName || user.email}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {displayName ? (
              <span className="text-sm font-medium text-text">{displayName}</span>
            ) : (
              <span className="text-sm text-muted italic">No name set</span>
            )}
            {getStatusBadge(user.status, user.moderationStatus)}
            {warningCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-500/10 text-yellow-500">
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {getRoleBadge(user.role)}
            <span className="text-[10px] text-muted">Joined {formatJoinDate(user.createdAt)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right hidden sm:block">
          <div className="text-[10px] text-muted">Last login</div>
          <div className={`text-xs ${formatDate(user.lastLoginAt) === 'Online' ? 'text-green-500' : 'text-text'}`}>
            {formatDate(user.lastLoginAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft } from 'lucide-react';

// User detail panel with tabs
function UserDetailPanel({ user, onUserUpdate, onBack }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [successMessage, setSuccessMessage] = useState('');

  // Overview/Account tab state
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [email, setEmail] = useState(user.email);

  // Security state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile tab state
  const [profile, setProfile] = useState({
    firstName: user.profile?.firstName || '',
    lastName: user.profile?.lastName || '',
    displayName: user.profile?.displayName || '',
    phone: user.profile?.phone || '',
    bio: user.profile?.bio || '',
    location: user.profile?.location || '',
    website: user.profile?.website || '',
    timezone: user.profile?.timezone || 'UTC'
  });

  // Flags tab state
  const [flags, setFlags] = useState(user.flags || {});
  const [newFlagKey, setNewFlagKey] = useState('');

  // Warning modal state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningLevel, setWarningLevel] = useState(1);
  const [warningReason, setWarningReason] = useState('');

  // Admin note modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  // Email and password modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Reset state when user changes or user data updates
  useEffect(() => {
    setRole(user.role);
    setStatus(user.status);
    setEmail(user.email);
    setProfile({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      displayName: user.profile?.displayName || '',
      phone: user.profile?.phone || '',
      bio: user.profile?.bio || '',
      location: user.profile?.location || '',
      website: user.profile?.website || '',
      timezone: user.profile?.timezone || 'UTC'
    });
    setFlags(user.flags || {});
    setNewPassword('');
    setConfirmPassword('');
  }, [user._id, user.role, user.flags]);

  // Reset active tab only when user changes
  useEffect(() => {
    setActiveTab('overview');
  }, [user._id]);

  // Fetch role config for the user's current role
  const { data: roleConfigData } = useRoleConfig(user.role);
  const { data: allFeaturesData } = useRoleFeatures();

  // Get role's default feature value
  const getRoleFeatureDefault = (key) => {
    return roleConfigData?.features?.[key] ?? false;
  };

  // Check if user has an explicit override for this feature
  const hasUserOverride = (key) => {
    return user.flags && key in user.flags;
  };

  // Get effective value (user override takes precedence over role default)
  const getEffectiveFlagValue = (key) => {
    if (hasUserOverride(key)) {
      return flags[key] ?? false;
    }
    return getRoleFeatureDefault(key);
  };

  // Toggle a feature flag (creates/removes user override)
  const toggleFeatureFlag = (key) => {
    setFlags(prev => {
      const roleDefault = getRoleFeatureDefault(key);
      const currentUserValue = prev[key];

      if (currentUserValue === undefined) {
        // No override exists - create one with opposite of role default
        return { ...prev, [key]: !roleDefault };
      } else if (currentUserValue === !roleDefault) {
        // Override exists and differs from role - remove it to use role default
        const newFlags = { ...prev };
        delete newFlags[key];
        return newFlags;
      } else {
        // Toggle the override value
        return { ...prev, [key]: !currentUserValue };
      }
    });
  };

  // Group features by category from API
  const groupedFeatures = (allFeaturesData?.features || []).reduce((acc, feature) => {
    const cat = feature.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {});

  const categoryLabels = {
    optional: 'Optional Features',
    beta: 'Beta Features',
    enhanced: 'Enhanced Features',
    other: 'Other Features'
  };

  const categoryDescriptions = {
    optional: 'Core features that can be enabled/disabled. Defaults are set by role configuration.',
    beta: 'Features currently in development',
    enhanced: 'Additional functionality for power users',
    other: 'Other feature flags'
  };

  const commonFlags = allFeaturesData?.features || [];

  const updateUser = useMutation({
    mutationFn: (data) => adminApi.updateUser(user._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessMessage('Changes saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      onUserUpdate?.();
    }
  });

  const resetPassword = useMutation({
    mutationFn: (password) => adminApi.resetUserPassword(user._id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      setSuccessMessage('Password reset successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const updateFlags = useMutation({
    mutationFn: (newFlags) => adminApi.updateUserFlags(user._id, newFlags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessMessage('Feature flags updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const warnUser = useMutation({
    mutationFn: (data) => adminApi.warnUser(user._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-moderation-history', user._id] });
      setShowWarningModal(false);
      setWarningReason('');
      setWarningLevel(1);
      setSuccessMessage('Warning issued successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const addAdminNote = useMutation({
    mutationFn: (data) => adminApi.addAdminNote(user._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-moderation-history', user._id] });
      setShowNoteModal(false);
      setNoteContent('');
      setSuccessMessage('Admin note added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const unsuspendUser = useMutation({
    mutationFn: (data) => adminApi.unsuspendUser(user._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessMessage('User unsuspended successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const toggleFlag = (key) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustomFlag = () => {
    if (!newFlagKey.trim()) return;
    setFlags(prev => ({ ...prev, [newFlagKey.trim()]: true }));
    setNewFlagKey('');
  };

  const removeFlag = (key) => {
    const newFlags = { ...flags };
    delete newFlags[key];
    setFlags(newFlags);
  };

  const handleFlagsSubmit = () => {
    const flagUpdates = {};
    Object.keys(flags).forEach(key => {
      flagUpdates[key] = flags[key];
    });
    if (user.flags) {
      Object.keys(user.flags).forEach(key => {
        if (!(key in flags)) {
          flagUpdates[key] = null;
        }
      });
    }
    updateFlags.mutate(flagUpdates);
  };

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    updateUser.mutate({ role, status, email });
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateUser.mutate({ profile });
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    resetPassword.mutate(newPassword);
  };

  const updateProfile = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'profile', label: 'Profile', icon: Edit3 },
    { id: 'features', label: 'Features', icon: Flag },
    { id: 'limits', label: 'Limits', icon: Gauge },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'moderation', label: 'Moderation', icon: AlertTriangle, badge: user.moderationStatus?.isSuspended }
  ];

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'
  ];

  const getDisplayName = () => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isSuspended = user.status === 'suspended' || user.moderationStatus?.isSuspended;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-panel border-t border-border">
      {/* Sticky User Header */}
      <div className="border-b border-border bg-panel">
        <div className="p-4 sm:p-6">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden flex items-center gap-2 text-sm text-muted hover:text-text mb-4 min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to users
            </button>
          )}
          <div className="flex items-start gap-3 sm:gap-4">
            <DefaultAvatar
              avatarUrl={user.profile?.avatarUrl}
              defaultAvatarId={user.profile?.defaultAvatarId}
              name={getDisplayName()}
              size="xl"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-text">{getDisplayName()}</h2>
                {isSuspended && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-orange-500/10 text-orange-500 flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Suspended
                  </span>
                )}
                {user.status === 'disabled' && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-red-500/10 text-red-500 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    Disabled
                  </span>
                )}
                {user.status === 'active' && !isSuspended && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Active
                  </span>
                )}
                {user.role === 'admin' && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-purple-500/10 text-purple-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                )}
                {user.role === 'premium' && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-amber-500/10 text-amber-500 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </span>
                )}
                {user.role === 'free' && (
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-500/10 text-blue-500 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Free
                  </span>
                )}
              </div>
              <p className="text-muted mt-1">{user.email}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                <span>Joined {formatDate(user.createdAt)}</span>
                <span>Last login {formatDate(user.lastLoginAt)}</span>
                <span>ID: {user._id.slice(0, 8)}...</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isSuspended ? (
                <button
                  onClick={() => unsuspendUser.mutate({ reason: 'Admin action' })}
                  disabled={unsuspendUser.isPending}
                  className="min-h-[44px] min-w-[44px] px-2 sm:px-3 py-2 border border-green-500/50 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/10 active:bg-green-500/20 flex items-center justify-center gap-2"
                >
                  {unsuspendUser.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Unsuspend</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowWarningModal(true)}
                  className="min-h-[44px] min-w-[44px] px-2 sm:px-3 py-2 border border-yellow-500/50 text-yellow-500 rounded-lg text-sm font-medium hover:bg-yellow-500/10 active:bg-yellow-500/20 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="hidden sm:inline">Warn</span>
                </button>
              )}
              <button
                onClick={() => setShowNoteModal(true)}
                className="min-h-[44px] min-w-[44px] px-2 sm:px-3 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-bg hover:text-text active:bg-card flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-hide border-t border-border">
          <div className="flex px-4 sm:px-6 min-w-max">
            {tabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors relative whitespace-nowrap min-h-[48px] ${
                  activeTab === id
                    ? 'text-primary border-primary'
                    : 'text-muted border-transparent hover:text-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
                {badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Account Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text flex items-center gap-2">
                <User className="w-4 h-4 text-muted" />
                Account
              </h3>
              <div className="bg-bg rounded-lg divide-y divide-border">
                {/* Email */}
                <div className="flex items-center justify-between p-4 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Email</p>
                    <p className="text-sm text-text truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="min-h-[40px] min-w-[70px] px-3 py-1.5 text-sm text-primary hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
                {/* Password */}
                <div className="flex items-center justify-between p-4 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Password</p>
                    <p className="text-sm text-text">••••••••</p>
                    {user.passwordChangedAt && (
                      <p className="text-xs text-muted mt-0.5">
                        Last changed {formatDate(user.passwordChangedAt)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="min-h-[40px] min-w-[70px] px-3 py-1.5 text-sm text-primary hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    Reset
                  </button>
                </div>
                {/* Role */}
                <div className="p-4">
                  <p className="text-xs text-muted mb-2">Role</p>
                  <div className="flex gap-2">
                    {['free', 'premium', 'admin'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          if (r === user.role) return;
                          setRole(r);
                          // Clear user flags when role changes so they inherit from new role config
                          const flagsToClear = {};
                          if (user.flags) {
                            Object.keys(user.flags).forEach(key => {
                              flagsToClear[key] = null;
                            });
                          }
                          // Update role and clear flags in parallel
                          updateUser.mutate({ role: r });
                          if (Object.keys(flagsToClear).length > 0) {
                            updateFlags.mutate(flagsToClear);
                          }
                        }}
                        className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95 ${
                          user.role === r
                            ? r === 'admin'
                              ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                              : r === 'premium'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                              : 'border-blue-500 bg-blue-500/10 text-blue-500'
                            : 'border-border text-muted hover:bg-panel active:bg-card'
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Changing role will reset feature flags to the role's defaults.
                  </p>
                </div>
                {/* Status */}
                <div className="p-4">
                  <p className="text-xs text-muted mb-2">Status</p>
                  <div className="flex gap-2">
                    {['active', 'suspended', 'disabled'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setStatus(s);
                          updateUser.mutate({ status: s });
                        }}
                        className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95 ${
                          user.status === s
                            ? s === 'active'
                              ? 'border-green-500 bg-green-500/10 text-green-500'
                              : s === 'suspended'
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-red-500 bg-red-500/10 text-red-500'
                            : 'border-border text-muted hover:bg-panel active:bg-card'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Stats Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted" />
                Content Stats
              </h3>
              <div className="bg-bg rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-panel rounded-lg">
                    <div className="text-2xl font-bold text-text">{user.contentCounts?.notes || 0}</div>
                    <div className="text-xs text-muted">Notes</div>
                  </div>
                  <div className="p-3 bg-panel rounded-lg">
                    <div className="text-2xl font-bold text-text">{user.contentCounts?.tasks || 0}</div>
                    <div className="text-xs text-muted">Tasks</div>
                  </div>
                  <div className="p-3 bg-panel rounded-lg">
                    <div className="text-2xl font-bold text-text">{user.contentCounts?.projects || 0}</div>
                    <div className="text-xs text-muted">Projects</div>
                  </div>
                  <div className="p-3 bg-panel rounded-lg">
                    <div className="text-2xl font-bold text-text">{user.contentCounts?.images || 0}</div>
                    <div className="text-xs text-muted">Images</div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('content')}
                  className="w-full mt-3 min-h-[44px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-panel hover:text-text active:bg-card flex items-center justify-center gap-2"
                >
                  View All Content
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Moderation Status Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted" />
                Moderation Status
              </h3>
              <div className="bg-bg rounded-lg p-4 space-y-4">
                {isSuspended ? (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-500">
                      <Ban className="w-4 h-4" />
                      <span className="text-sm font-medium">Currently Suspended</span>
                    </div>
                    {user.moderationStatus?.suspendReason && (
                      <p className="text-xs text-orange-400 mt-1">
                        Reason: {user.moderationStatus.suspendReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-500">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">No Active Restrictions</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Warnings</span>
                  <span className={`text-sm ${user.moderationStatus?.warningCount > 0 ? 'text-yellow-500' : 'text-muted'}`}>
                    {user.moderationStatus?.warningCount || 0} warning{user.moderationStatus?.warningCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowWarningModal(true)}
                    className="min-h-[44px] px-3 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 active:bg-yellow-600"
                  >
                    Issue Warning
                  </button>
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="min-h-[44px] px-3 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-panel hover:text-text active:bg-card"
                  >
                    Add Note
                  </button>
                </div>
                <button
                  onClick={() => setActiveTab('moderation')}
                  className="w-full min-h-[44px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-panel hover:text-text active:bg-card flex items-center justify-center gap-2"
                >
                  View Full History
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <form onSubmit={handleProfileSubmit} className="bg-bg rounded-lg p-6 space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <DefaultAvatar
                  avatarUrl={user.profile?.avatarUrl}
                  defaultAvatarId={user.profile?.defaultAvatarId}
                  name={getDisplayName()}
                  size="xl"
                />
                <div>
                  <p className="text-sm text-muted">User avatar is managed by the user</p>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile('firstName', e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile('lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => updateProfile('displayName', e.target.value)}
                  placeholder="johndoe"
                  className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  rows={3}
                  placeholder="A short bio..."
                  className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted block mb-1">Location</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => updateProfile('location', e.target.value)}
                    placeholder="City, Country"
                    className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Timezone</label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => updateProfile('timezone', e.target.value)}
                    className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Website</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => updateProfile('website', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                type="submit"
                disabled={updateUser.isPending}
                className="w-full px-4 py-2 min-h-[48px] bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover active:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateUser.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Save Profile Changes
              </button>
            </form>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="max-w-2xl space-y-6">
            {/* Role info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-blue-500">
                {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> :
                 user.role === 'premium' ? <Crown className="w-4 h-4" /> :
                 <User className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Role
                </span>
              </div>
              <p className="text-sm text-blue-500/80 mt-1">
                Feature defaults come from the role configuration. User overrides are shown with badges.
              </p>
            </div>

            {/* Categorized flags from role config */}
            {Object.entries(groupedFeatures).map(([category, features]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-text mb-1">
                  {categoryLabels[category] || category}
                </h3>
                <p className="text-xs text-muted mb-3">
                  {categoryDescriptions[category] || ''}
                </p>
                <div className="bg-bg rounded-lg divide-y divide-border">
                  {features.map(({ key, label, description }) => {
                    const roleDefault = getRoleFeatureDefault(key);
                    const hasOverride = hasUserOverride(key);
                    const effectiveValue = getEffectiveFlagValue(key);

                    return (
                      <div key={key} className="flex items-center justify-between p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text">{label}</span>
                            {!hasOverride && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-500">
                                Role Default
                              </span>
                            )}
                            {hasOverride && effectiveValue !== roleDefault && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                effectiveValue
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {effectiveValue ? 'Override: On' : 'Override: Off'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5">{description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFeatureFlag(key)}
                          className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 min-h-[28px] ${
                            effectiveValue
                              ? hasOverride ? 'bg-green-500' : 'bg-primary'
                              : hasOverride ? 'bg-red-500/50' : 'bg-border'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                              effectiveValue ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom flags */}
            <div>
              <h3 className="text-sm font-medium text-text mb-1">Custom Flags</h3>
              <p className="text-xs text-muted mb-3">Additional custom flags for this user</p>
              <div className="bg-bg rounded-lg p-4 space-y-3">
                {Object.entries(flags)
                  .filter(([key]) => !commonFlags.find(f => f.key === key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-panel rounded min-h-[52px]"
                    >
                      <span className="text-sm font-mono text-text truncate mr-2">{key}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleFlag(key)}
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            value ? 'bg-primary' : 'bg-border'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                              value ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFlag(key)}
                          className="p-2 text-muted hover:text-red-500 active:bg-red-500/10 rounded min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                    placeholder="custom.flag.key"
                    className="flex-1 px-3 py-2 min-h-[44px] bg-panel border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomFlag()}
                  />
                  <button
                    type="button"
                    onClick={addCustomFlag}
                    disabled={!newFlagKey.trim()}
                    className="min-h-[44px] px-4 py-2 border border-border text-muted rounded-lg text-sm hover:bg-panel hover:text-text active:bg-card disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFlagsSubmit}
              disabled={updateFlags.isPending}
              className="w-full min-h-[48px] px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover active:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateFlags.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Save Feature Flags
            </button>
          </div>
        )}

        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <UserLimitsTab user={user} />
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <UserContentTab user={user} />
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <UserActivityTab user={user} />
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <UserModerationTab user={user} />
        )}
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWarningModal(false)} />
          <div className="relative w-full sm:max-w-md bg-panel border border-border rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Issue Warning</h2>
              <p className="text-sm text-muted">
                This will be warning #{(user.moderationStatus?.warningCount || 0) + 1} for this user
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-text block mb-2">Warning Level</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setWarningLevel(level)}
                      className={`flex-1 min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-colors active:scale-95 ${
                        warningLevel === level
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                          : 'border-border text-muted hover:bg-bg active:bg-card'
                      }`}
                    >
                      Level {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-text block mb-2">Reason</label>
                <textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  rows={3}
                  placeholder="Describe the reason for this warning..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => setShowWarningModal(false)}
                className="min-h-[48px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-bg active:bg-card"
              >
                Cancel
              </button>
              <button
                onClick={() => warnUser.mutate({ reason: warningReason, level: warningLevel })}
                disabled={warnUser.isPending || !warningReason.trim()}
                className="min-h-[48px] px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {warnUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Issue Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNoteModal(false)} />
          <div className="relative w-full sm:max-w-md bg-panel border border-border rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Add Admin Note</h2>
              <p className="text-sm text-muted">Internal note visible only to admins</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-text block mb-2">Note</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  placeholder="Add your note here..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => setShowNoteModal(false)}
                className="min-h-[48px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-bg active:bg-card"
              >
                Cancel
              </button>
              <button
                onClick={() => addAdminNote.mutate({ content: noteContent })}
                disabled={addAdminNote.isPending || !noteContent.trim()}
                className="min-h-[48px] px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover active:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addAdminNote.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEmailModal(false)} />
          <div className="relative w-full sm:max-w-md bg-panel border border-border rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Change Email Address</h2>
              <p className="text-sm text-muted truncate">Update email for {user.email}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUser.mutate({ email }, {
                  onSuccess: () => {
                    setShowEmailModal(false);
                  }
                });
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="text-sm text-text block mb-2">New Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setShowEmailModal(false);
                  }}
                  className="min-h-[48px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-bg active:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUser.isPending || !email || email === user.email}
                  className="min-h-[48px] px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover active:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
          <div className="relative w-full sm:max-w-md bg-panel border border-border rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Reset Password</h2>
              <p className="text-sm text-muted truncate">Set a new password for {user.email}</p>
            </div>
            <form onSubmit={handlePasswordReset} className="p-4 space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-500">This will immediately change the user's password</p>
              </div>
              <div>
                <label className="text-sm text-text block mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-text block mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPasswordModal(false);
                  }}
                  className="min-h-[48px] px-4 py-2 border border-border text-muted rounded-lg text-sm font-medium hover:bg-bg active:bg-card"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPassword.isPending || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="min-h-[48px] px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 active:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetPassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Create User Modal
function CreateUserModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('free');
  const [showPassword, setShowPassword] = useState(false);

  const createUser = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess?.();
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    createUser.mutate({ email, password, role });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-panel border border-border rounded-t-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Create New User</h2>
            <p className="text-sm text-muted">Add a new user to the system</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg active:bg-card rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 min-h-[44px] bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Confirm password"
              />
            </div>
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              Passwords do not match
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('free')}
                className={`flex items-center justify-center gap-1 sm:gap-2 min-h-[48px] p-2 sm:p-3 rounded-lg border transition-colors active:scale-95 ${
                  role === 'free'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border hover:bg-bg active:bg-card text-muted'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-sm">Free</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('premium')}
                className={`flex items-center justify-center gap-1 sm:gap-2 min-h-[48px] p-2 sm:p-3 rounded-lg border transition-colors active:scale-95 ${
                  role === 'premium'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-border hover:bg-bg active:bg-card text-muted'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Premium</span>
                <span className="text-sm sm:hidden">Pro</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-1 sm:gap-2 min-h-[48px] p-2 sm:p-3 rounded-lg border transition-colors active:scale-95 ${
                  role === 'admin'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                    : 'border-border hover:bg-bg active:bg-card text-muted'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm">Admin</span>
              </button>
            </div>
            {role === 'premium' && (
              <p className="text-xs text-muted mt-2">Premium users get access to all optional features automatically.</p>
            )}
          </div>

          {createUser.error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {createUser.error.response?.data?.error || createUser.error.message}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg active:bg-card transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending || !email || !password || password.length < 8 || password !== confirmPassword}
              className="flex-1 min-h-[48px] px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover active:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createUser.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Empty state when no user is selected
function EmptyUserPanel() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-panel text-muted border-t border-border">
      <User className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">Select a user</p>
      <p className="text-sm">Choose a user from the list to view their details</p>
    </div>
  );
}

function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = { limit: 100 };
      if (search) params.q = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const response = await adminApi.getUsers(params);
      return response.data;
    }
  });

  // Update selected user when data changes (e.g., after mutation)
  const selectedUserData = selectedUser
    ? data?.users?.find(u => u._id === selectedUser._id) || selectedUser
    : null;

  // On mobile, when a user is selected, show the detail panel
  const showMobileDetail = selectedUserData !== null;

  return (
    <div className="h-screen flex flex-col px-4 sm:px-6 py-4 sm:py-8">
      <AdminNav />

      <div className="flex-1 flex overflow-hidden -mx-4 sm:-mx-6">
        {/* User List (Left Panel) - hidden on mobile when user selected */}
        <div className={`w-full md:w-[360px] border-r border-t border-border flex flex-col flex-shrink-0 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text min-h-[44px]"
              >
                <option value="">All Roles</option>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text min-h-[44px]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="disabled">Disabled</option>
              </select>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover flex items-center gap-1 min-h-[44px] ml-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">New User</span>
              </button>
            </div>
          </div>

          {/* User count */}
          <div className="px-4 py-2 text-xs text-muted border-b border-border">
            {data?.total || 0} users
          </div>

          {/* User List */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 bg-bg rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-500">Failed to load users</p>
                <p className="text-sm text-muted mt-1">{error.message}</p>
              </div>
            ) : data?.users?.length === 0 ? (
              <div className="p-8 text-center">
                <User className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-muted">No users found</p>
              </div>
            ) : (
              data?.users?.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  isSelected={selectedUser?._id === user._id}
                  onClick={() => setSelectedUser(user)}
                />
              ))
            )}
          </div>
        </div>

        {/* User Detail Panel (Right) - full width on mobile */}
        <div className={`flex-1 ${showMobileDetail ? 'flex' : 'hidden md:flex'} flex-col`}>
          {selectedUserData ? (
            <UserDetailPanel
              key={selectedUserData._id}
              user={selectedUserData}
              onUserUpdate={() => refetch()}
              onBack={() => setSelectedUser(null)}
            />
          ) : (
            <EmptyUserPanel />
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newUser) => {
            if (newUser) setSelectedUser(newUser);
          }}
        />
      )}
    </div>
  );
}

export default AdminUsersPage;
