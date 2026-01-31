/**
 * =============================================================================
 * PRODUCTIVITYSCORE.JSX - Dashboard Productivity Score Display
 * =============================================================================
 *
 * Displays the user's productivity score with optional change indicator.
 * Used in the Focus Hero widget to show daily productivity metrics.
 *
 * Props:
 * - score: Number 0-100 representing productivity percentage (required)
 * - change: Number +/- representing percentage change from yesterday
 * - label: Label text (defaults to 'Productivity Score')
 * - loading: Shows skeleton placeholder when true
 *
 * Design notes:
 * - Score displays as large green number (32px, bold)
 * - Positive changes shown in green with up arrow
 * - Negative changes shown in orange (not red per design rules)
 * - Includes loading skeleton for async data
 *
 * Uses V2 CSS variables for theme consistency.
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './ProductivityScore.css';

/**
 * ProductivityScore - Displays productivity score with change indicator
 *
 * @param {Object} props
 * @param {number} props.score - Productivity score 0-100
 * @param {number} props.change - Percentage change from yesterday
 * @param {string} props.label - Label text
 * @param {boolean} props.loading - Show skeleton placeholder
 */
export default function ProductivityScore({ score, change, label = 'Productivity Score', loading = false }) {
  // Show skeleton when loading
  if (loading) {
    return (
      <div className="productivity-score productivity-score--loading" aria-busy="true" aria-label="Loading productivity score">
        <div className="productivity-score__label-skeleton" />
        <div className="productivity-score__value-skeleton" />
      </div>
    );
  }

  const isPositive = change >= 0;
  const changeText = isPositive ? `+${change}%` : `${change}%`;

  return (
    <div className="productivity-score">
      <div className="productivity-score__label">{label}</div>
      <div className="productivity-score__row">
        <span className="productivity-score__value">{score}%</span>
        {change !== undefined && (
          <span className={`productivity-score__change ${isPositive ? 'productivity-score__change--positive' : 'productivity-score__change--negative'}`}>
            {isPositive ? '↑' : '↓'} {changeText} from yesterday
          </span>
        )}
      </div>
    </div>
  );
}

ProductivityScore.propTypes = {
  score: PropTypes.number.isRequired,
  change: PropTypes.number,
  label: PropTypes.string,
  loading: PropTypes.bool
};
