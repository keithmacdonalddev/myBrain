import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareModal from './ShareModal';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

function ShareButton({
  itemId,
  itemType,
  itemTitle,
  variant = 'icon', // 'icon' | 'button' | 'text'
  className = '',
  size = 'md' // 'sm' | 'md' | 'lg'
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const socialEnabled = useFeatureFlag('socialEnabled');

  // Don't render if social features are disabled
  if (!socialEnabled) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const renderButton = () => {
    switch (variant) {
      case 'icon':
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`p-2 hover:bg-bg rounded-lg transition-colors text-muted hover:text-text ${className}`}
            title="Share"
          >
            <Share2 className={sizeClasses[size]} />
          </button>
        );

      case 'button':
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors ${buttonSizeClasses[size]} ${className}`}
          >
            <Share2 className={sizeClasses[size]} />
            Share
          </button>
        );

      case 'text':
        return (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 text-muted hover:text-text transition-colors ${className}`}
          >
            <Share2 className={sizeClasses[size]} />
            <span>Share</span>
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderButton()}

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={itemId}
        itemType={itemType}
        itemTitle={itemTitle}
      />
    </>
  );
}

export default ShareButton;
