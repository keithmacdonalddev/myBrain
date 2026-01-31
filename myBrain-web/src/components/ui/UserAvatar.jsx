import { useMemo } from 'react';
import { cn } from '../../lib/utils';

// Default avatar colors for users without custom avatars
const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

const SIZES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
};

const PRESENCE_SIZES = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

const PRESENCE_COLORS = {
  available: 'bg-green-500',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
  dnd: 'bg-red-600',
  offline: 'bg-gray-400',
};

/**
 * Get initials from a user object
 * Handles both nested profile and flat user structures
 * Priority: displayName > firstName+lastName > firstName > email > fallback
 */
function getInitials(user) {
  // Handle both user.profile and direct profile object
  const profile = user?.profile || user;
  const email = user?.email || profile?.email;

  if (profile?.displayName) {
    const words = profile.displayName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return profile.displayName.slice(0, 2).toUpperCase();
  }
  if (profile?.firstName && profile?.lastName) {
    return (profile.firstName[0] + profile.lastName[0]).toUpperCase();
  }
  if (profile?.firstName) {
    return profile.firstName.slice(0, 2).toUpperCase();
  }
  // Fallback to email username (before @)
  if (email) {
    const username = email.split('@')[0];
    return username.slice(0, 2).toUpperCase();
  }
  return 'U';
}

/**
 * Get a consistent color based on user ID
 */
function getColorFromId(id) {
  if (!id) return AVATAR_COLORS[0];
  const hash = id.toString().split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UserAvatar({
  user,
  size = 'md',
  showPresence = false,
  className,
  onClick,
}) {
  const initials = useMemo(() => getInitials(user), [user]);
  const bgColor = useMemo(() => getColorFromId(user?._id), [user?._id]);

  const avatarUrl = user?.profile?.avatarUrl;
  const hasCustomAvatar = !!avatarUrl;

  const presenceStatus = user?.presence?.currentStatus || 'offline';
  const isOnline = user?.presence?.isOnline;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full flex-shrink-0',
        SIZES[size],
        !hasCustomAvatar && bgColor,
        onClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Open user profile' : undefined}
    >
      {hasCustomAvatar ? (
        <img
          src={avatarUrl}
          alt={user?.profile?.displayName || 'User avatar'}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="text-white font-medium select-none">{initials}</span>
      )}

      {showPresence && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            PRESENCE_SIZES[size],
            isOnline ? PRESENCE_COLORS[presenceStatus] : PRESENCE_COLORS.offline
          )}
          title={presenceStatus}
        />
      )}
    </div>
  );
}
