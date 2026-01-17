import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  User,
  Shield,
  ShieldCheck,
  MoreVertical,
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

function UserRow({ user, onEdit, onEditFlags }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-500">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500">
        <User className="w-3 h-3" />
        User
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
    <div className="flex items-center gap-4 p-4 hover:bg-bg rounded-lg transition-colors border-b border-border last:border-0">
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

      {/* Actions menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-panel rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-muted" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-panel border border-border rounded-lg shadow-lg z-20 py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(user);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg"
              >
                <Edit3 className="w-4 h-4" />
                Edit User
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEditFlags(user);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg"
              >
                <Flag className="w-4 h-4" />
                Manage Flags
              </button>
            </div>
          </>
        )}
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
    { id: 'security', label: 'Security', icon: Lock }
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      role === 'user'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-bg text-muted'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    User
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

function EditFlagsModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [flags, setFlags] = useState(user.flags || {});
  const [newFlagKey, setNewFlagKey] = useState('');

  // Common feature flags
  const commonFlags = [
    { key: 'notes.advanced-search', label: 'Advanced Search' },
    { key: 'notes.export', label: 'Export Notes' },
    { key: 'fitness.enabled', label: 'Fitness Module' },
    { key: 'kb.enabled', label: 'Knowledge Base' },
    { key: 'messages.enabled', label: 'Messages' },
    { key: 'debug.logging', label: 'Debug Logging' }
  ];

  const updateFlags = useMutation({
    mutationFn: (newFlags) => adminApi.updateUserFlags(user._id, newFlags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
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

  const handleSubmit = () => {
    // Convert to format expected by API (set removed flags to null)
    const flagUpdates = {};

    // Add enabled flags
    Object.keys(flags).forEach(key => {
      flagUpdates[key] = flags[key];
    });

    // Mark removed flags as null
    if (user.flags) {
      Object.keys(user.flags).forEach(key => {
        if (!(key in flags)) {
          flagUpdates[key] = null;
        }
      });
    }

    updateFlags.mutate(flagUpdates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-panel border border-border rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">Feature Flags</h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1 space-y-4">
          <div className="text-sm text-muted mb-4">
            Managing flags for <span className="text-text font-medium">{user.email}</span>
          </div>

          {/* Common flags */}
          <div>
            <h3 className="text-sm font-medium text-text mb-2">Common Flags</h3>
            <div className="space-y-2">
              {commonFlags.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-3 bg-bg rounded-lg cursor-pointer hover:bg-bg/80"
                >
                  <span className="text-sm text-text">{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleFlag(key)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      flags[key] ? 'bg-primary' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        flags[key] ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

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
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateFlags.isPending}
            className="flex-1 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateFlags.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Flags'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editingFlags, setEditingFlags] = useState(null);

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
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-bg border border-border rounded-lg hover:border-primary/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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
            <option value="user">User</option>
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
                  onEditFlags={setEditingFlags}
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

      {/* Edit modals */}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
      {editingFlags && (
        <EditFlagsModal user={editingFlags} onClose={() => setEditingFlags(null)} />
      )}
    </div>
  );
}

export default AdminUsersPage;
