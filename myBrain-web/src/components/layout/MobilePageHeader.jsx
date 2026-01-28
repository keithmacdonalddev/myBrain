import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

/**
 * Mobile page header with X close button that navigates back to Today.
 * Used for pages accessed from the mobile menu to provide consistent navigation.
 *
 * @param {string} title - The page title to display
 * @param {React.ReactNode} icon - Optional icon component to display next to title
 * @param {React.ReactNode} rightAction - Optional action button(s) for the right side
 */
function MobilePageHeader({ title, icon: Icon, rightAction }) {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/app/today');
  };

  return (
    <div className="sm:hidden flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-border bg-bg">
      <button
        onClick={handleClose}
        className="p-2 -ml-2 text-muted hover:text-text active:text-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        <h1 className="text-lg font-semibold text-text">{title}</h1>
      </div>

      {rightAction ? (
        <div className="min-w-[44px] flex justify-end">
          {rightAction}
        </div>
      ) : (
        <div className="w-10" />
      )}
    </div>
  );
}

export default MobilePageHeader;
