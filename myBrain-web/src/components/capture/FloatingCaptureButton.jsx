import { Plus } from 'lucide-react';
import { useQuickCapture } from '../../contexts/QuickCaptureContext';

/**
 * FloatingCaptureButton - Mobile FAB for quick capture
 *
 * A floating action button (FAB) that opens the QuickCaptureModal.
 * Only visible on mobile devices, positioned above the bottom nav.
 *
 * z-index: 35 (below modals at z-50, above content)
 * Touch target: 56px (minimum 44px per accessibility guidelines)
 */
function FloatingCaptureButton() {
  const { openCapture } = useQuickCapture();

  return (
    <button
      onClick={openCapture}
      className="sm:hidden fixed right-4 bottom-[140px] z-[35] w-14 h-14 bg-primary text-white rounded-full shadow-theme-elevated hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center"
      aria-label="Quick capture"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

export default FloatingCaptureButton;
