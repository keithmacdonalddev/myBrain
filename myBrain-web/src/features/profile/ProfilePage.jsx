import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  User,
  MapPin,
  Globe,
  Phone,
  Clock,
  Save,
  Loader2,
  ArrowLeft,
  Camera,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { profileApi } from '../../lib/api';
import { setUser } from '../../store/authSlice';
import useToast from '../../hooks/useToast';
import { useUploadAvatar, useDeleteAvatar } from './hooks/useAvatar';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const toast = useToast();
  const avatarInputRef = useRef(null);

  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    displayName: user?.profile?.displayName || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || '',
    location: user?.profile?.location || '',
    website: user?.profile?.website || '',
    timezone: user?.profile?.timezone || 'UTC',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await profileApi.updateProfile(formData);
      dispatch(setUser(response.data.user));
      setHasChanges(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayName = () => {
    if (user?.profile?.displayName) return user.profile.displayName;
    if (user?.profile?.firstName) {
      return user.profile.lastName
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user.profile.firstName;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      await uploadAvatarMutation.mutateAsync(file);
      toast.success('Avatar updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload avatar');
    }

    // Reset input
    e.target.value = '';
  };

  const handleDeleteAvatar = async () => {
    if (!user?.profile?.avatarUrl) return;

    if (!window.confirm('Are you sure you want to remove your avatar?')) {
      return;
    }

    try {
      await deleteAvatarMutation.mutateAsync();
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove avatar');
    }
  };

  const isAvatarLoading = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-text mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-4">
          {/* Avatar with upload */}
          <div className="relative group">
            <input
              ref={avatarInputRef}
              type="file"
              accept={ALLOWED_AVATAR_TYPES.join(',')}
              onChange={handleAvatarChange}
              className="hidden"
            />

            <div
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-full overflow-hidden cursor-pointer relative"
            >
              {user?.profile?.avatarUrl ? (
                <img
                  src={user.profile.avatarUrl}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-primary">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Loading overlay */}
              {isAvatarLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {/* Hover overlay */}
              {!isAvatarLoading && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Delete button */}
            {user?.profile?.avatarUrl && !isAvatarLoading && (
              <button
                onClick={handleDeleteAvatar}
                className="absolute -bottom-1 -right-1 p-1.5 bg-panel border border-border rounded-full hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors text-muted"
                title="Remove avatar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-text">{getDisplayName()}</h1>
            <p className="text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-lg p-6">
        <h2 className="text-lg font-medium text-text mb-6">Personal Information</h2>

        <div className="space-y-6">
          {/* Name fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="How you want to be called"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p className="text-xs text-muted mt-1">This will be shown instead of your email throughout the app</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
            />
            <p className="text-xs text-muted mt-1">{formData.bio.length}/500 characters</p>
          </div>

          <hr className="border-border" />

          <h2 className="text-lg font-medium text-text">Contact & Location</h2>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City, Country"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (US)</option>
              <option value="America/Chicago">Central Time (US)</option>
              <option value="America/Denver">Mountain Time (US)</option>
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Europe/Berlin">Berlin</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Asia/Singapore">Singapore</option>
              <option value="Australia/Sydney">Sydney</option>
              <option value="Pacific/Auckland">Auckland</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 mt-6 border-t border-border">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;
