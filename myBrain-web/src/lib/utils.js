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
  if (num == null || num === 0) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Shorten Claude model name for display
 * @param {string} model - Full model name (e.g., "claude-opus-4-5-20251101")
 * @returns {string} Shortened model name (e.g., "opus-4-5")
 */
export function formatModelName(model) {
  if (!model) return model;
  const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : model;
}
