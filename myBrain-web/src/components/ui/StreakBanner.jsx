/**
 * =============================================================================
 * STREAKBANNER.JSX - Daily Streak Display Component
 * =============================================================================
 *
 * Displays the user's current streak count in a vibrant gradient banner.
 * Shows a fire emoji and the number of consecutive days.
 *
 * Props:
 * - count: Number of days in the streak (required)
 * - loading: Boolean to show skeleton loader when true
 *
 * Features:
 * - Orange-to-red gradient background (matches prototype)
 * - Fire emoji for visual appeal
 * - Returns null when count is 0 (no streak to display)
 * - Loading skeleton that matches component dimensions
 *
 * Uses V2 CSS variables for theme consistency.
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './StreakBanner.css';

/**
 * StreakBanner - Displays the user's current daily streak
 *
 * @param {Object} props
 * @param {number} props.count - Number of consecutive days in the streak
 * @param {boolean} props.loading - Whether to show loading skeleton
 */
export default function StreakBanner({ count, loading = false }) {
  // Show skeleton while loading
  if (loading) {
    return <div className="streak-banner-skeleton" aria-label="Loading streak" />;
  }

  // Don't render anything if count is 0 or negative
  if (!count || count <= 0) {
    return null;
  }

  return (
    <div className="streak-banner" role="status" aria-label={`${count}-day streak`}>
      <span className="streak-banner-emoji" aria-hidden="true">
        🔥
      </span>
      <span className="streak-banner-text">{count}-day streak!</span>
    </div>
  );
}

StreakBanner.propTypes = {
  count: PropTypes.number.isRequired,
  loading: PropTypes.bool
};
