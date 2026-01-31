/**
 * ProgressRing Component
 *
 * SVG-based circular progress indicator inspired by Apple Watch design.
 * Shows percentage completion with smooth animation.
 *
 * @example
 * <ProgressRing value={75} size={80} color="var(--v2-blue)" showLabel />
 */

import React from 'react';
import PropTypes from 'prop-types';

const ProgressRing = ({
  value = 0,
  size = 80,
  strokeWidth = 8,
  color = 'var(--v2-blue)',
  backgroundColor = 'var(--v2-bg-tertiary)',
  showLabel = false,
  className = '',
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  // Center point
  const center = size / 2;

  return (
    <div
      className={`progress-ring ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />

        {/* Optional label */}
        {showLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: size * 0.25,
              fontWeight: 600,
              fill: 'var(--v2-text-primary)',
            }}
          >
            {Math.round(clampedValue)}%
          </text>
        )}
      </svg>
    </div>
  );
};

ProgressRing.propTypes = {
  value: PropTypes.number,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  color: PropTypes.string,
  backgroundColor: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

export default ProgressRing;
