/**
 * =============================================================================
 * QUICKACTIONBUTTON.JSX - Quick Action Button Component
 * =============================================================================
 *
 * Compact action buttons for the dashboard's quick actions section.
 * Used for common actions like "New Task", "New Note", "Focus Mode", etc.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'gradient' - Button style variant
 * - icon: React node - Icon element to display before text
 * - children: React node - Button text/label
 * - fullWidth: boolean - If true, spans full width (2 columns in grid)
 * - onClick: function - Click handler
 * - disabled: boolean - Disables the button
 *
 * Variants:
 * - primary: Blue background (#007AFF), white text - main actions
 * - secondary: Tertiary background, primary text - secondary actions
 * - gradient: Purple to pink gradient - special/featured actions
 *
 * Uses V2 CSS variables for theme consistency.
 * Includes hover effects: brightness(1.1), scale(1.02)
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './QuickActionButton.css';

/**
 * QuickActionButton - Compact button for quick dashboard actions
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'gradient'} props.variant - Button style variant
 * @param {React.ReactNode} props.icon - Icon to display before text
 * @param {React.ReactNode} props.children - Button text/label
 * @param {boolean} props.fullWidth - If true, spans 2 columns in grid
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 */
export default function QuickActionButton({
  variant = 'primary',
  icon,
  children,
  fullWidth = false,
  onClick,
  disabled = false
}) {
  // Build class name based on variant and fullWidth
  const classNames = [
    'v2-quick-action-btn',
    `v2-quick-action-btn--${variant}`,
    fullWidth && 'v2-quick-action-btn--full-width',
    disabled && 'v2-quick-action-btn--disabled'
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
    >
      {icon && <span className="v2-quick-action-btn__icon">{icon}</span>}
      {children && <span className="v2-quick-action-btn__text">{children}</span>}
    </button>
  );
}

QuickActionButton.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'gradient']),
  icon: PropTypes.node,
  children: PropTypes.node,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};
