/**
 * ActivityRings Component
 *
 * Apple Watch-style nested activity rings showing progress metrics.
 * Displays 3 concentric rings for fitness, health, and focus.
 *
 * Design reference: .claude/design/dashboard-redesign-2026-01/dashboard-final-v2.html
 * Ring sizes: Outer 100x100, Middle 76x76, Inner 52x52
 *
 * @example
 * <ActivityRings
 *   fitness={75}  // 0-100 percentage
 *   health={50}
 *   focus={90}
 *   size="md"
 *   showLabels
 * />
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Skeleton } from './Skeleton';
import './ActivityRings.css';

// Ring configuration matching the prototype
const RING_CONFIG = {
  outer: {
    viewBox: 100,
    radius: 45,
    strokeWidth: 8,
    color: 'var(--v2-red, #FF3B30)',
    gradientId: 'ringGradientRed',
    label: 'Fitness',
  },
  middle: {
    viewBox: 76,
    radius: 33,
    strokeWidth: 8,
    color: 'var(--v2-green, #34C759)',
    gradientId: 'ringGradientGreen',
    label: 'Health',
  },
  inner: {
    viewBox: 52,
    radius: 21,
    strokeWidth: 8,
    color: 'var(--v2-blue, #007AFF)',
    gradientId: 'ringGradientBlue',
    label: 'Focus',
  },
};

// Size variants (wrapper dimensions)
const SIZE_MAP = {
  sm: 80,
  md: 100,
  lg: 120,
};

// Calculate ring dimensions based on size variant
const getRingDimensions = (size) => {
  const baseSize = SIZE_MAP[size] || SIZE_MAP.md;
  const scale = baseSize / 100; // Scale factor from base 100px

  return {
    outer: { size: Math.round(100 * scale), viewBox: 100, radius: 45, strokeWidth: 8 },
    middle: { size: Math.round(76 * scale), viewBox: 76, radius: 33, strokeWidth: 8 },
    inner: { size: Math.round(52 * scale), viewBox: 52, radius: 21, strokeWidth: 8 },
  };
};

/**
 * Single ring SVG component
 */
const Ring = ({ viewBox, radius, strokeWidth, progress, color, gradientId, animate, className }) => {
  const center = viewBox / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress || 0));
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <svg
      className={`activity-ring ${className || ''}`}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Background ring */}
      <circle
        className="activity-ring-bg"
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Progress ring */}
      <circle
        className={`activity-ring-progress ${animate ? 'animate' : ''}`}
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animate ? offset : circumference}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </svg>
  );
};

Ring.propTypes = {
  viewBox: PropTypes.number.isRequired,
  radius: PropTypes.number.isRequired,
  strokeWidth: PropTypes.number.isRequired,
  progress: PropTypes.number,
  color: PropTypes.string.isRequired,
  gradientId: PropTypes.string.isRequired,
  animate: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * Loading skeleton for activity rings
 */
const ActivityRingsSkeleton = ({ size = 'md', showLabels = false }) => {
  const wrapperSize = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className="activity-rings-container">
      <div
        className="activity-rings-wrapper skeleton-pulse"
        style={{ width: wrapperSize, height: wrapperSize }}
      >
        <Skeleton className="activity-rings-skeleton" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
      </div>
      {showLabels && (
        <div className="activity-ring-labels">
          {['Fitness', 'Health', 'Focus'].map((label) => (
            <div key={label} className="activity-ring-label">
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

ActivityRingsSkeleton.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabels: PropTypes.bool,
};

/**
 * ActivityRings component
 */
const ActivityRings = ({
  fitness = 0,
  health = 0,
  focus = 0,
  size = 'md',
  showLabels = false,
  loading = false,
  className = '',
}) => {
  // Animate rings on mount
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Delay animation start slightly for smooth entrance
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-animate when values change
  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [fitness, health, focus]);

  if (loading) {
    return <ActivityRingsSkeleton size={size} showLabels={showLabels} />;
  }

  const dimensions = getRingDimensions(size);
  const wrapperSize = SIZE_MAP[size] || SIZE_MAP.md;

  const rings = [
    { key: 'outer', progress: fitness, config: RING_CONFIG.outer, dim: dimensions.outer },
    { key: 'middle', progress: health, config: RING_CONFIG.middle, dim: dimensions.middle },
    { key: 'inner', progress: focus, config: RING_CONFIG.inner, dim: dimensions.inner },
  ];

  return (
    <div className={`activity-rings-container ${className}`}>
      <div
        className="activity-rings-wrapper"
        style={{ width: wrapperSize, height: wrapperSize }}
      >
        {rings.map(({ key, progress, config, dim }) => (
          <div
            key={key}
            className={`activity-ring-layer activity-ring-${key}`}
            style={{ width: dim.size, height: dim.size }}
          >
            <Ring
              viewBox={config.viewBox}
              radius={config.radius}
              strokeWidth={config.strokeWidth}
              progress={progress}
              color={config.color}
              gradientId={`${config.gradientId}-${key}`}
              animate={animate}
            />
          </div>
        ))}
      </div>

      {showLabels && (
        <div className="activity-ring-labels">
          <div className="activity-ring-label">
            <span className="activity-ring-dot red" />
            <span className="activity-ring-label-text">Fitness</span>
            <span className="activity-ring-value">{Math.round(fitness)}%</span>
          </div>
          <div className="activity-ring-label">
            <span className="activity-ring-dot green" />
            <span className="activity-ring-label-text">Health</span>
            <span className="activity-ring-value">{Math.round(health)}%</span>
          </div>
          <div className="activity-ring-label">
            <span className="activity-ring-dot blue" />
            <span className="activity-ring-label-text">Focus</span>
            <span className="activity-ring-value">{Math.round(focus)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

ActivityRings.propTypes = {
  /** Outer ring progress (0-100) - typically tasks/fitness */
  fitness: PropTypes.number,
  /** Middle ring progress (0-100) - typically health/events */
  health: PropTypes.number,
  /** Inner ring progress (0-100) - typically focus time */
  focus: PropTypes.number,
  /** Size variant */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Whether to show labels below the rings */
  showLabels: PropTypes.bool,
  /** Show loading skeleton */
  loading: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ActivityRings;
