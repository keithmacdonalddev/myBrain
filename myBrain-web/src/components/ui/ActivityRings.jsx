/**
 * ActivityRings Component
 *
 * Apple Watch-style nested activity rings showing multiple progress metrics.
 * Displays up to 3 concentric rings (outer to inner).
 *
 * Typical usage:
 * - Outer ring: Tasks completed
 * - Middle ring: Events attended
 * - Inner ring: Focus time
 *
 * @example
 * <ActivityRings
 *   rings={[
 *     { value: 75, color: 'var(--v2-red)', label: 'Tasks' },
 *     { value: 50, color: 'var(--v2-green)', label: 'Events' },
 *     { value: 90, color: 'var(--v2-blue)', label: 'Focus' }
 *   ]}
 *   size={120}
 * />
 */

import React from 'react';
import PropTypes from 'prop-types';

const ActivityRings = ({
  rings = [],
  size = 120,
  strokeWidth = 10,
  gap = 4,
  showLabels = false,
  className = '',
}) => {
  // Limit to 3 rings maximum
  const validRings = rings.slice(0, 3);

  // Center point
  const center = size / 2;

  // Calculate radius for each ring (outer to inner)
  const getRadius = (index) => {
    const totalGap = gap * index;
    const totalStroke = strokeWidth * index;
    return (size - strokeWidth) / 2 - totalGap - totalStroke;
  };

  return (
    <div
      className={`activity-rings ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        {validRings.map((ring, index) => {
          const radius = getRadius(index);
          const circumference = radius * 2 * Math.PI;
          const clampedValue = Math.min(100, Math.max(0, ring.value || 0));
          const offset = circumference - (clampedValue / 100) * circumference;

          return (
            <g key={index}>
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--v2-bg-tertiary)"
                strokeWidth={strokeWidth}
                opacity={0.3}
              />

              {/* Progress ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={ring.color || 'var(--v2-blue)'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                role="progressbar"
                aria-valuenow={clampedValue}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={ring.label}
              />
            </g>
          );
        })}
      </svg>

      {/* Optional labels */}
      {showLabels && validRings.length > 0 && (
        <div
          style={{
            marginTop: 'var(--v2-spacing-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--v2-spacing-xs)',
          }}
        >
          {validRings.map((ring, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--v2-spacing-xs)',
                fontSize: '0.75rem',
                color: 'var(--v2-text-secondary)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: ring.color || 'var(--v2-blue)',
                }}
              />
              <span>{ring.label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                {Math.round(ring.value || 0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

ActivityRings.propTypes = {
  rings: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
      label: PropTypes.string,
    })
  ),
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  gap: PropTypes.number,
  showLabels: PropTypes.bool,
  className: PropTypes.string,
};

export default ActivityRings;
