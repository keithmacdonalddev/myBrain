import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge to handle conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a large number with thousands separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}
