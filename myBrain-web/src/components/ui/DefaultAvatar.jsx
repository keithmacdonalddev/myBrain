// Default avatar options - SVG-based avatars with different styles
// Each avatar has a unique id, name, and SVG content

export const DEFAULT_AVATARS = [
  {
    id: 'avatar-1',
    name: 'Blue Circle',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad1)"/>
      <circle cx="50" cy="40" r="16" fill="#BFDBFE"/>
      <ellipse cx="50" cy="80" rx="28" ry="20" fill="#BFDBFE"/>
    </svg>`,
  },
  {
    id: 'avatar-2',
    name: 'Purple Diamond',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6D28D9;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad2)"/>
      <polygon points="50,20 75,50 50,80 25,50" fill="#DDD6FE"/>
    </svg>`,
  },
  {
    id: 'avatar-3',
    name: 'Green Leaf',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad3)"/>
      <path d="M50 25 C70 35, 75 55, 50 75 C25 55, 30 35, 50 25" fill="#A7F3D0"/>
      <line x1="50" y1="45" x2="50" y2="70" stroke="#059669" stroke-width="2"/>
    </svg>`,
  },
  {
    id: 'avatar-4',
    name: 'Orange Sun',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad4)"/>
      <circle cx="50" cy="50" r="20" fill="#FEF3C7"/>
      <g fill="#FEF3C7">
        <rect x="48" y="15" width="4" height="12" rx="2"/>
        <rect x="48" y="73" width="4" height="12" rx="2"/>
        <rect x="15" y="48" width="12" height="4" rx="2"/>
        <rect x="73" y="48" width="12" height="4" rx="2"/>
      </g>
    </svg>`,
  },
  {
    id: 'avatar-5',
    name: 'Pink Heart',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#EC4899;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#DB2777;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad5)"/>
      <path d="M50 75 C25 55, 25 35, 40 30 C47 27, 50 32, 50 32 C50 32, 53 27, 60 30 C75 35, 75 55, 50 75" fill="#FBCFE8"/>
    </svg>`,
  },
  {
    id: 'avatar-6',
    name: 'Cyan Wave',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#06B6D4;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0891B2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad6)"/>
      <path d="M20 50 Q35 35, 50 50 T80 50" stroke="#CFFAFE" stroke-width="6" fill="none"/>
      <path d="M20 60 Q35 45, 50 60 T80 60" stroke="#CFFAFE" stroke-width="4" fill="none" opacity="0.6"/>
    </svg>`,
  },
  {
    id: 'avatar-7',
    name: 'Red Star',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#EF4444;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#DC2626;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad7)"/>
      <polygon points="50,20 58,40 80,40 63,55 70,75 50,62 30,75 37,55 20,40 42,40" fill="#FECACA"/>
    </svg>`,
  },
  {
    id: 'avatar-8',
    name: 'Indigo Moon',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad8" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4F46E5;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad8)"/>
      <circle cx="55" cy="45" r="22" fill="#C7D2FE"/>
      <circle cx="68" cy="38" r="12" fill="url(#grad8)"/>
      <circle cx="30" cy="65" r="3" fill="#C7D2FE" opacity="0.6"/>
      <circle cx="75" cy="70" r="2" fill="#C7D2FE" opacity="0.6"/>
      <circle cx="25" cy="35" r="2" fill="#C7D2FE" opacity="0.6"/>
    </svg>`,
  },
];

// The default avatar (first one) that new users get
export const DEFAULT_AVATAR_ID = 'avatar-1';

// Get avatar by ID
export function getAvatarById(id) {
  return DEFAULT_AVATARS.find(a => a.id === id) || DEFAULT_AVATARS[0];
}

// Avatar component that renders either a custom avatar URL or a default SVG avatar
export default function DefaultAvatar({
  avatarUrl,
  defaultAvatarId,
  name = '',
  size = 'md',
  className = ''
}) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // If user has uploaded a custom avatar, use it
  if (avatarUrl) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Otherwise, use default avatar
  const avatar = getAvatarById(defaultAvatarId || DEFAULT_AVATAR_ID);

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: avatar.svg }}
    />
  );
}

// Avatar selector component for profile settings
export function AvatarSelector({ selectedId, onSelect, currentAvatarUrl, onCustomAvatarBlock }) {
  const handleClick = (avatarId) => {
    if (currentAvatarUrl && onCustomAvatarBlock) {
      onCustomAvatarBlock();
    } else {
      onSelect(avatarId);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        {currentAvatarUrl
          ? 'Delete your custom avatar to use a default one.'
          : 'Choose a default avatar or upload your own.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => handleClick(avatar.id)}
            disabled={!!currentAvatarUrl}
            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
              currentAvatarUrl
                ? 'opacity-40 cursor-not-allowed border-transparent'
                : selectedId === avatar.id
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-transparent hover:border-border hover:scale-105'
            }`}
            title={currentAvatarUrl ? 'Delete custom avatar first' : avatar.name}
            dangerouslySetInnerHTML={{ __html: avatar.svg }}
          />
        ))}
      </div>
    </div>
  );
}
