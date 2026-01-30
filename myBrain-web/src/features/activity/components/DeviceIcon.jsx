/**
 * DeviceIcon Component
 *
 * Renders the appropriate icon based on device type.
 * Used in session cards and login history to identify device types.
 */
import { Monitor, Smartphone, Tablet, Globe } from 'lucide-react';

// Map device types to their corresponding icons
const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

/**
 * Returns the appropriate icon component for a given device type
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Device type (desktop, mobile, tablet, unknown)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Icon component
 */
export default function DeviceIcon({ type = 'unknown', className = '' }) {
  // Get the icon component for this device type, fallback to Globe
  const Icon = DEVICE_ICONS[type] || DEVICE_ICONS.unknown;

  return <Icon className={className} />;
}
