import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
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
  EyeOff
} from 'lucide-react';
import { adminApi } from '../../lib/api';

function UserRow({ user, onEdit }) {
  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-500">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (role === 'premium') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500">
          <Crown className="w-3 h-3" />
          Premium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500">
        <User className="w-3 h-3" />
        Free
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'disabled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-500">
          <UserX className="w-3 h-3" />
          Disabled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">
        <UserCheck className="w-3 h-3" />
        Active
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const flagCount = user.flags ? Object.keys(user.flags).filter(k => user.flags[k]).length : 0;

  return (
    <div
      onClick={() => onEdit(user)}
      className="flex items-center gap-4 p-4 hover:bg-bg rounded-lg transition-colors border-b border-border last:border-0 cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-medium">
          {user.email?.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text">{user.email}</span>
          {getRoleBadge(user.role)}
          {getStatusBadge(user.status)}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span>Joined {formatDate(user.createdAt)}</span>
          {user.lastLoginAt && (
            <span>Last login {formatDate(user.lastLoginAt)}</span>
          )}
          {flagCount > 0 && (
            <span className="flex items-center gap-1">
              <Flag className="w-3 h-3" />
              {flagCount} flags
            </span>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="text-muted">
        <Edit3 className="w-4 h-4" />
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('account');
  const [successMessage, setSuccessMessage] = useState('');

  // Account tab state
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [email, setEmail] = useState(user.email);

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

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Flags tab state
  const [flags, setFlags] = useState(user.flags || {});
  const [newFlagKey, setNewFlagKey] = useState('');

  // Premium features - auto-enabled for premium and admin users
  const PREMIUM_FEATURES = [
    'calendarEnabled',
    'imagesEnabled',
    'projectsEnabled',
    'lifeAreasEnabled',
    'weatherEnabled',
    'analyticsEnabled',
    'savedLocationsEnabled'
  ];

  // Check if current role selection is premium or admin
  const isPremiumRole = role === 'premium' || role === 'admin';

  // Check if a feature is a premium feature
  const isPremiumFeature = (key) => PREMIUM_FEATURES.includes(key);

  // Get effective flag value (considering role)
  const getEffectiveFlagValue = (key) => {
    if (isPremiumRole && isPremiumFeature(key)) {
      return true; // Premium features are always on for premium/admin
    }
    return flags[key] || false;
  };

  // Feature flags organized by category
  // Note: Flag keys use camelCase (no dots) to be compatible with MongoDB/Mongoose
  const flagCategories = [
    {
      name: 'Optional Features',
      description: isPremiumRole
        ? 'These features are automatically enabled for premium/admin users'
        : 'Core features that can be enabled/disabled per user',
      flags: [
        { key: 'calendarEnabled', label: 'Calendar', description: 'Event scheduling and calendar views' },
        { key: 'projectsEnabled', label: 'Projects', description: 'Project management with linked items' },
        { key: 'imagesEnabled', label: 'Images', description: 'Image gallery and media management' },
        { key: 'weatherEnabled', label: 'Weather', description: 'Weather widget on dashboard' },
        { key: 'lifeAreasEnabled', label: 'Life Areas', description: 'Categorize items by life area (Health, Career, etc.)' },
        { key: 'analyticsEnabled', label: 'Analytics', description: 'Usage analytics and insights' },
        { key: 'savedLocationsEnabled', label: 'Saved Locations', description: 'Save and manage locations for weather' }
      ]
    },
    {
      name: 'Beta Features',
      description: 'Features currently in development (require explicit flag even for premium)',
      flags: [
        { key: 'fitnessEnabled', label: 'Fitness Tracking', description: 'Access to fitness and workout tracking' },
        { key: 'kbEnabled', label: 'Knowledge Base', description: 'Access to knowledge base / wiki feature' },
        { key: 'messagesEnabled', label: 'Messages', description: 'Access to messaging feature' }
      ]
    },
    {
      name: 'Enhanced Features',
      description: 'Additional functionality for power users',
      flags: [
        { key: 'notesAdvancedSearch', label: 'Advanced Search', description: 'Enable advanced search operators' },
        { key: 'notesExport', label: 'Export Notes', description: 'Allow exporting notes to various formats' }
      ]
    },
    {
      name: 'Developer',
      description: 'Developer and debugging options',
      flags: [
        { key: 'debug.logging', label: 'Debug Logging', description: 'Enable verbose client-side logging' }
      ]
    }
  ];

  // Flatten for backwards compatibility
  const commonFlags = flagCategories.flatMap(cat => cat.flags);

  const updateUser = useMutation({
    mutationFn: (data) => adminApi.updateUser(user._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccessMessage('User updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const resetPassword = useMutation({
    mutationFn: (password) => adminApi.resetUserPassword(user._id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewPassword('');
      setConfirmPassword('');
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
    },
    onError: (error) => {
      console.error('Failed to update flags:', error);
      console.error('Error response:', error.response?.data);
    }
  });

  const toggleFlag = (key) => {
    setFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const addCustomFlag = () => {
    if (!newFlagKey.trim()) return;
    setFlags(prev => ({
      ...prev,
      [newFlagKey.trim()]: true
    }));
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
    if (newPassword !== confirmPassword) {
      return;
    }
    resetPassword.mutate(newPassword);
  };

  const updateProfile = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'profile', label: 'Profile', icon: Edit3 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'flags', label: 'Feature Flags', icon: Flag }
  ];

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-panel border border-border rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Edit User</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-500 text-sm">
            <Check className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('free')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      role === 'free'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('premium')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      role === 'premium'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    Premium
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      role === 'admin'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                </div>
                {(role === 'premium' || role === 'admin') && (
                  <p className="text-xs text-amber-500 mt-2">
                    {role === 'admin' ? 'Admin' : 'Premium'} users get access to all optional features automatically.
                  </p>
                )}
                {role !== user.role && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-500">
                      <strong>Role change:</strong> {user.role} → {role}
                      {(role === 'premium' || role === 'admin') && user.role === 'free' && (
                        <span className="block mt-1">This will automatically enable all optional features.</span>
                      )}
                      {role === 'free' && (user.role === 'premium' || user.role === 'admin') && (
                        <span className="block mt-1">This will disable auto-enabled optional features. Only explicitly set flags will remain.</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      status === 'active'
                        ? 'border-green-500 bg-green-500/10 text-green-500'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('disabled')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      status === 'disabled'
                        ? 'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    Disabled
                  </button>
                </div>
              </div>

              {updateUser.error && activeTab === 'account' && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {updateUser.error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={updateUser.isPending}
                className="w-full px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateUser.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Account Changes'
                )}
              </button>
            </form>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile('firstName', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile('lastName', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => updateProfile('displayName', e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="A short bio about the user..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Location</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => updateProfile('location', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="New York, NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Timezone</label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => updateProfile('timezone', e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Website</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => updateProfile('website', e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="https://example.com"
                />
              </div>

              {updateUser.error && activeTab === 'profile' && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {updateUser.error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={updateUser.isPending}
                className="w-full px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateUser.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile Changes'
                )}
              </button>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-500">
                  Reset the user's password. They will need to use this new password to log in.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
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
                    className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Passwords do not match
                </div>
              )}

              {resetPassword.error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {resetPassword.error.message}
                </div>
              )}

              <button
                type="submit"
                disabled={resetPassword.isPending || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              {/* Password changed info */}
              {user.passwordChangedAt && (
                <p className="text-xs text-muted text-center">
                  Password last changed: {new Date(user.passwordChangedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </form>
          )}

          {/* Feature Flags Tab */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              {/* Premium role notice */}
              {isPremiumRole && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {role === 'admin' ? 'Admin' : 'Premium'} User
                    </span>
                  </div>
                  <p className="text-sm text-amber-500/80 mt-1">
                    Optional features are automatically enabled. Beta features still require explicit activation.
                  </p>
                </div>
              )}

              {/* Categorized flags */}
              {flagCategories.map((category) => (
                <div key={category.name}>
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-text">{category.name}</h3>
                    <p className="text-xs text-muted">{category.description}</p>
                  </div>
                  <div className="space-y-2">
                    {category.flags.map(({ key, label, description }) => {
                      const isAutoEnabled = isPremiumRole && isPremiumFeature(key);
                      const effectiveValue = getEffectiveFlagValue(key);

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-3 bg-bg rounded-lg ${
                            isAutoEnabled ? 'ring-1 ring-amber-500/30' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text font-medium">{label}</span>
                              {isAutoEnabled && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500">
                                  <Crown className="w-2.5 h-2.5" />
                                  Auto
                                </span>
                              )}
                            </div>
                            {description && (
                              <p className="text-xs text-muted mt-0.5">{description}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => !isAutoEnabled && toggleFlag(key)}
                            disabled={isAutoEnabled}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                              effectiveValue
                                ? isAutoEnabled ? 'bg-amber-500' : 'bg-primary'
                                : 'bg-border'
                            } ${isAutoEnabled ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                effectiveValue ? 'left-5' : 'left-1'
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
                <h3 className="text-sm font-medium text-text mb-2">Custom Flags</h3>
                <div className="space-y-2">
                  {Object.entries(flags)
                    .filter(([key]) => !commonFlags.find(f => f.key === key))
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-bg rounded-lg"
                      >
                        <span className="text-sm text-text font-mono">{key}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFlag(key)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${
                              value ? 'bg-primary' : 'bg-border'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                value ? 'left-5' : 'left-1'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFlag(key)}
                            className="p-1 text-muted hover:text-red-500"
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
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onKeyDown={(e) => e.key === 'Enter' && addCustomFlag()}
                    />
                    <button
                      type="button"
                      onClick={addCustomFlag}
                      disabled={!newFlagKey.trim()}
                      className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {updateFlags.error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {updateFlags.error.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleFlagsSubmit}
                disabled={updateFlags.isPending}
                className="w-full px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateFlags.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Feature Flags'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel border border-border rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">Create New User</h2>
            <p className="text-sm text-muted">Add a new user to the system</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
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
                className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
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
                className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  role === 'free'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border hover:bg-bg text-muted'
                }`}
              >
                <User className="w-4 h-4" />
                Free
              </button>
              <button
                type="button"
                onClick={() => setRole('premium')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  role === 'premium'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-border hover:bg-bg text-muted'
                }`}
              >
                <Crown className="w-4 h-4" />
                Premium
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  role === 'admin'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                    : 'border-border hover:bg-bg text-muted'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending || !email || !password || password.length < 8 || password !== confirmPassword}
              className="flex-1 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text">User Management</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text"
          >
            <option value="">All Roles</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-bg rounded-lg animate-pulse" />
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
          <div className="p-4">
            <div className="bg-panel border border-border rounded-lg">
              {data?.users?.map((user) => (
                <UserRow
                  key={user._id}
                  user={user}
                  onEdit={setEditingUser}
                />
              ))}
            </div>
            {data?.total > data?.users?.length && (
              <p className="text-center text-sm text-muted mt-4">
                Showing {data.users.length} of {data.total} users
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

export default AdminUsersPage;
