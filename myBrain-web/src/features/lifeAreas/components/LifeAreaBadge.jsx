import { Folder } from 'lucide-react';

const iconMap = {
  Folder,
  Inbox: () => <span className="text-xs">I</span>,
  Briefcase: () => <span className="text-xs">B</span>,
  Heart: () => <span className="text-xs">H</span>,
  DollarSign: () => <span className="text-xs">$</span>,
  Home: () => <span className="text-xs">H</span>,
  Users: () => <span className="text-xs">U</span>,
  Book: () => <span className="text-xs">B</span>,
  Target: () => <span className="text-xs">T</span>,
};

function getIcon(iconName) {
  return iconMap[iconName] || Folder;
}

export function LifeAreaBadge({ lifeArea, size = 'sm', showName = true, className = '' }) {
  if (!lifeArea) return null;

  const Icon = getIcon(lifeArea.icon);
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${lifeArea.color}20`,
        color: lifeArea.color,
      }}
    >
      <Icon className={iconSizes[size]} />
      {showName && <span>{lifeArea.name}</span>}
    </span>
  );
}

export default LifeAreaBadge;
