import { useState, useRef } from 'react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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
  Trash2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Settings,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { profileApi } from '../../lib/api';
import { setUser, logout } from '../../store/authSlice';
import useToast from '../../hooks/useToast';
import { useUploadAvatar, useDeleteAvatar } from './hooks/useAvatar';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import LocationPicker from '../../components/ui/LocationPicker';
import DefaultAvatar, { DEFAULT_AVATARS, AvatarSelector } from '../../components/ui/DefaultAvatar';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const TABS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'account', label: 'Account', icon: Settings },
];

// Change Email Modal
function ChangeEmailModal({ user, onClose, onUpdate }) {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEmail || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await profileApi.changeEmail(newEmail, password);
      onUpdate(response.data.user);
      toast.success('Email changed successfully');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to change email');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-panel glass-heavy border-t sm:border border-border rounded-t-2xl sm:rounded-lg shadow-theme-2xl z-50">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text">Change Email Address</h3>
          <button onClick={onClose} className="p-2 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-muted">
            Current email: <span className="text-text font-medium">{user?.email}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-text mb-1">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="newemail@example.com"
              autoFocus
              className="w-full px-3 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Confirm with Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full px-3 py-3 pr-12 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[48px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-border rounded-lg text-sm text-text hover:bg-bg active:bg-bg/80 transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newEmail || !password}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none min-h-[48px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Change Email'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Change Password Modal
function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      await profileApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-panel glass-heavy border-t sm:border border-border rounded-t-2xl sm:rounded-lg shadow-theme-2xl z-50">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text">Change Password</h3>
          <button onClick={onClose} className="p-2 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Current Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoFocus
              className="w-full px-3 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full px-3 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Confirm New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[48px]"
            />
          </div>

          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              id="showPasswordsModal"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="w-5 h-5 rounded border-border"
            />
            <span className="text-sm text-muted">Show passwords</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-border rounded-lg text-sm text-text hover:bg-bg active:bg-bg/80 transition-colors min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none min-h-[48px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Delete Account Modal
function DeleteAccountModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const handleDelete = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setIsDeleting(true);
    try {
      await profileApi.deleteAccount(password);
      toast.success('Account deleted');
      window.location.href = '/login';
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-panel glass-heavy border-t sm:border border-border rounded-t-2xl sm:rounded-lg shadow-theme-2xl z-50 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-text">Delete Account?</h3>
            <p className="text-sm text-muted">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-muted mb-4">
          All your notes, settings, and data will be permanently deleted. Enter your password to confirm.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-3 py-3 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-danger/50 focus:border-danger mb-4 min-h-[48px]"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-border rounded-lg text-sm text-text hover:bg-bg active:bg-bg/80 transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || !password}
            className="flex-1 px-4 py-3 bg-danger text-white rounded-lg text-sm hover:bg-danger/90 active:bg-danger/80 transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {isDeleting ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </>
  );
}

// Personal Information Tab Content
function PersonalInfoTab({ user, formData, setFormData, hasChanges, setHasChanges, isSaving, onSubmit, savedLocations, onSelectDefaultAvatar, onCustomAvatarBlock, isSelectingAvatar }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Avatar Selection */}
      <div>
        <h3 className="text-base font-medium text-text mb-3">Profile Picture</h3>
        <AvatarSelector
          selectedId={user?.profile?.defaultAvatarId}
          currentAvatarUrl={user?.profile?.avatarUrl}
          onSelect={onSelectDefaultAvatar}
          onCustomAvatarBlock={onCustomAvatarBlock}
        />
        {isSelectingAvatar && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Updating avatar...
          </div>
        )}
      </div>

      <hr className="border-border" />

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

      <h3 className="text-base font-medium text-text">Contact & Location</h3>

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
        <LocationPicker
          value={formData.location}
          onChange={(value) => handleChange('location', value)}
          placeholder="Search for your location..."
          savedLocations={savedLocations}
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

          <optgroup label="Canada">
            <option value="America/St_Johns">Newfoundland (St. John's)</option>
            <option value="America/Halifax">Atlantic (Halifax)</option>
            <option value="America/Moncton">Atlantic (Moncton)</option>
            <option value="America/Toronto">Eastern (Toronto)</option>
            <option value="America/Montreal">Eastern (Montreal)</option>
            <option value="America/Winnipeg">Central (Winnipeg)</option>
            <option value="America/Regina">Saskatchewan (Regina)</option>
            <option value="America/Edmonton">Mountain (Edmonton)</option>
            <option value="America/Calgary">Mountain (Calgary)</option>
            <option value="America/Vancouver">Pacific (Vancouver)</option>
            <option value="America/Whitehorse">Yukon (Whitehorse)</option>
          </optgroup>

          <optgroup label="United States">
            <option value="America/New_York">Eastern (New York)</option>
            <option value="America/Detroit">Eastern (Detroit)</option>
            <option value="America/Chicago">Central (Chicago)</option>
            <option value="America/Denver">Mountain (Denver)</option>
            <option value="America/Phoenix">Arizona (Phoenix)</option>
            <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
            <option value="America/Anchorage">Alaska (Anchorage)</option>
            <option value="Pacific/Honolulu">Hawaii (Honolulu)</option>
          </optgroup>

          <optgroup label="Mexico & Central America">
            <option value="America/Mexico_City">Mexico City</option>
            <option value="America/Cancun">Cancun</option>
            <option value="America/Costa_Rica">Costa Rica</option>
            <option value="America/Panama">Panama</option>
          </optgroup>

          <optgroup label="South America">
            <option value="America/Bogota">Bogota</option>
            <option value="America/Lima">Lima</option>
            <option value="America/Santiago">Santiago</option>
            <option value="America/Sao_Paulo">São Paulo</option>
            <option value="America/Buenos_Aires">Buenos Aires</option>
            <option value="America/Caracas">Caracas</option>
          </optgroup>

          <optgroup label="Europe">
            <option value="Europe/London">London</option>
            <option value="Europe/Dublin">Dublin</option>
            <option value="Europe/Lisbon">Lisbon</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Europe/Brussels">Brussels</option>
            <option value="Europe/Amsterdam">Amsterdam</option>
            <option value="Europe/Berlin">Berlin</option>
            <option value="Europe/Zurich">Zurich</option>
            <option value="Europe/Vienna">Vienna</option>
            <option value="Europe/Rome">Rome</option>
            <option value="Europe/Madrid">Madrid</option>
            <option value="Europe/Stockholm">Stockholm</option>
            <option value="Europe/Oslo">Oslo</option>
            <option value="Europe/Copenhagen">Copenhagen</option>
            <option value="Europe/Helsinki">Helsinki</option>
            <option value="Europe/Warsaw">Warsaw</option>
            <option value="Europe/Prague">Prague</option>
            <option value="Europe/Budapest">Budapest</option>
            <option value="Europe/Athens">Athens</option>
            <option value="Europe/Bucharest">Bucharest</option>
            <option value="Europe/Kyiv">Kyiv</option>
            <option value="Europe/Moscow">Moscow</option>
            <option value="Europe/Istanbul">Istanbul</option>
          </optgroup>

          <optgroup label="Africa">
            <option value="Africa/Casablanca">Casablanca</option>
            <option value="Africa/Lagos">Lagos</option>
            <option value="Africa/Cairo">Cairo</option>
            <option value="Africa/Nairobi">Nairobi</option>
            <option value="Africa/Johannesburg">Johannesburg</option>
          </optgroup>

          <optgroup label="Middle East">
            <option value="Asia/Jerusalem">Jerusalem</option>
            <option value="Asia/Beirut">Beirut</option>
            <option value="Asia/Dubai">Dubai</option>
            <option value="Asia/Riyadh">Riyadh</option>
            <option value="Asia/Tehran">Tehran</option>
            <option value="Asia/Kuwait">Kuwait</option>
            <option value="Asia/Qatar">Qatar</option>
          </optgroup>

          <optgroup label="Asia">
            <option value="Asia/Karachi">Karachi</option>
            <option value="Asia/Kolkata">India (Kolkata)</option>
            <option value="Asia/Mumbai">Mumbai</option>
            <option value="Asia/Dhaka">Dhaka</option>
            <option value="Asia/Bangkok">Bangkok</option>
            <option value="Asia/Ho_Chi_Minh">Ho Chi Minh</option>
            <option value="Asia/Jakarta">Jakarta</option>
            <option value="Asia/Singapore">Singapore</option>
            <option value="Asia/Kuala_Lumpur">Kuala Lumpur</option>
            <option value="Asia/Hong_Kong">Hong Kong</option>
            <option value="Asia/Shanghai">Shanghai</option>
            <option value="Asia/Taipei">Taipei</option>
            <option value="Asia/Manila">Manila</option>
            <option value="Asia/Seoul">Seoul</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </optgroup>

          <optgroup label="Australia & Pacific">
            <option value="Australia/Perth">Perth</option>
            <option value="Australia/Darwin">Darwin</option>
            <option value="Australia/Adelaide">Adelaide</option>
            <option value="Australia/Brisbane">Brisbane</option>
            <option value="Australia/Sydney">Sydney</option>
            <option value="Australia/Melbourne">Melbourne</option>
            <option value="Australia/Hobart">Hobart</option>
            <option value="Pacific/Auckland">Auckland</option>
            <option value="Pacific/Fiji">Fiji</option>
            <option value="Pacific/Guam">Guam</option>
          </optgroup>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
  );
}

// Account Tab Content
function AccountTab({ user, onUpdate }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Email Section */}
      <div>
        <h3 className="text-base font-medium text-text mb-3">Email Address</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg flex-1">
            <Mail className="w-4 h-4 text-muted" />
            <span className="text-text">{user?.email}</span>
          </div>
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            Change
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div>
        <h3 className="text-base font-medium text-text mb-3">Password</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-bg border border-border rounded-lg flex-1">
            <Lock className="w-4 h-4 text-muted" />
            <span className="text-muted">••••••••••••</span>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            Change
          </button>
        </div>
        {user?.passwordChangedAt && (
          <p className="text-xs text-muted mt-2">
            Last changed: {new Date(user.passwordChangedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <hr className="border-border" />

      {/* Account Info */}
      <div>
        <h3 className="text-base font-medium text-text mb-3">Account Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">Account created:</dt>
            <dd className="text-text">{new Date(user?.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Role:</dt>
            <dd className="text-text capitalize">{user?.role}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Status:</dt>
            <dd className="text-text capitalize">{user?.status}</dd>
          </div>
        </dl>
      </div>

      <hr className="border-border" />

      {/* Danger Zone */}
      <div>
        <h3 className="text-base font-medium text-danger mb-2">Danger Zone</h3>
        <p className="text-sm text-muted mb-3">
          Once you delete your account, there is no going back. All your data will be permanently removed.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 border border-danger text-danger rounded-lg hover:bg-danger/10 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Modals */}
      {showEmailModal && (
        <ChangeEmailModal
          user={user}
          onClose={() => setShowEmailModal(false)}
          onUpdate={onUpdate}
        />
      )}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}

function ProfilePage({ onMobileClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const toast = useToast();
  const avatarInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('personal');
  const [mobileSection, setMobileSection] = useState(null); // null = show menu, string = show section

  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();
  const { data: savedLocations = [] } = useSavedLocations();

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
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [showDeleteAvatarDialog, setShowDeleteAvatarDialog] = useState(false);

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

  const handleUserUpdate = (updatedUser) => {
    dispatch(setUser(updatedUser));
  };

  const handleSignOut = async () => {
    await dispatch(logout());
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

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.');
      return;
    }

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

    e.target.value = '';
  };

  const handleDeleteAvatar = () => {
    if (!user?.profile?.avatarUrl) return;
    setShowDeleteAvatarDialog(true);
  };

  const handleDeleteAvatarConfirm = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove avatar');
    }
  };

  const handleSelectDefaultAvatar = async (avatarId) => {
    setIsSelectingAvatar(true);
    try {
      const response = await profileApi.updateProfile({ defaultAvatarId: avatarId });
      dispatch(setUser(response.data.user));
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update avatar');
    } finally {
      setIsSelectingAvatar(false);
    }
  };

  const handleCustomAvatarBlock = () => {
    toast.info('Delete your custom avatar first to use a default one');
  };

  const isAvatarLoading = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending || isSelectingAvatar;

  const activeMobileSection = TABS.find(t => t.id === mobileSection);

  // Avatar component shared between mobile and desktop
  const AvatarHeader = ({ compact = false }) => (
    <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'}`}>
      <div className="relative group flex-shrink-0">
        <input
          ref={avatarInputRef}
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(',')}
          onChange={handleAvatarChange}
          className="hidden"
        />

        <div
          onClick={handleAvatarClick}
          className="relative cursor-pointer"
        >
          <DefaultAvatar
            avatarUrl={user?.profile?.avatarUrl}
            defaultAvatarId={user?.profile?.defaultAvatarId}
            name={getDisplayName()}
            size="xl"
            className={`group-hover:opacity-80 transition-opacity ${compact ? 'w-16 h-16' : 'w-20 h-20'}`}
          />

          {isAvatarLoading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}

          {!isAvatarLoading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full flex items-center justify-center transition-colors">
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {user?.profile?.avatarUrl && !isAvatarLoading && (
          <button
            onClick={handleDeleteAvatar}
            className="absolute -bottom-1 -right-1 p-2 bg-panel border border-border rounded-full hover:bg-red-500 hover:border-red-500 hover:text-white active:bg-red-600 transition-colors text-muted min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Remove avatar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="min-w-0">
        <h1 className={`font-semibold text-text truncate ${compact ? 'text-lg' : 'text-2xl'}`}>{getDisplayName()}</h1>
        <p className="text-sm text-muted truncate">{user?.email}</p>
      </div>
    </div>
  );

  // Render content based on section ID
  const renderContent = (sectionId) => {
    switch (sectionId) {
      case 'personal':
        return (
          <PersonalInfoTab
            user={user}
            formData={formData}
            setFormData={setFormData}
            hasChanges={hasChanges}
            setHasChanges={setHasChanges}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            savedLocations={savedLocations}
            onSelectDefaultAvatar={handleSelectDefaultAvatar}
            onCustomAvatarBlock={handleCustomAvatarBlock}
            isSelectingAvatar={isSelectingAvatar}
          />
        );
      case 'account':
        return <AccountTab user={user} onUpdate={handleUserUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-bg h-full">
      {/* Mobile View */}
      <div className="sm:hidden h-full flex flex-col relative overflow-hidden">
        {/* Mobile Menu View */}
        <div
          className={`h-full flex flex-col transition-transform duration-300 ease-in-out ${
            mobileSection ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {/* Header with close button */}
          <div className="flex-shrink-0 flex items-center justify-between h-14 px-4">
            <button
              onClick={onMobileClose}
              className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-text">Profile</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-auto">
            {/* Avatar Header */}
            <div className="p-4">
              <AvatarHeader compact />
            </div>

            {/* iOS-style list navigation */}
            <div className="mt-4 mx-4 bg-panel rounded-xl overflow-hidden">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <div key={tab.id} className="relative">
                    <button
                      onClick={() => setMobileSection(tab.id)}
                      className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 text-left active:bg-bg/50 transition-colors min-h-[48px]"
                    >
                      <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="flex-1 text-[15px] text-text">{tab.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted/40" />
                    </button>
                    {index < TABS.length - 1 && (
                      <div className="absolute bottom-0 left-[52px] right-0 h-px bg-border/60" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sign Out Footer - always at bottom */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 bg-panel rounded-xl text-danger hover:bg-danger/10 active:bg-danger/20 transition-colors min-h-[48px]"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[15px] font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Section Content - slides in from right */}
        <div
          className={`absolute inset-0 h-full bg-bg flex flex-col transition-transform duration-300 ease-in-out ${
            mobileSection ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Section Header with back button */}
          <div className="flex-shrink-0 flex items-center h-14 px-4">
            <button
              onClick={() => setMobileSection(null)}
              className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-text ml-2">{activeMobileSection?.label}</h1>
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-auto p-4">
            {mobileSection && renderContent(mobileSection)}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/app/today"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text mb-4 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <AvatarHeader />
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap min-h-[48px] ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-panel border border-border rounded-lg p-6 shadow-theme-card">
          {renderContent(activeTab)}
        </div>
      </div>

      {/* Delete Avatar Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteAvatarDialog}
        onClose={() => setShowDeleteAvatarDialog(false)}
        onConfirm={handleDeleteAvatarConfirm}
        title="Remove Avatar"
        message="Are you sure you want to remove your profile picture? You can always upload a new one or select a default avatar later."
        confirmText="Remove Avatar"
        cancelText="Keep Avatar"
        variant="warning"
      />
    </div>
  );
}

export default ProfilePage;
