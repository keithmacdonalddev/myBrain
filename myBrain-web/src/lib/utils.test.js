import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatNumber } from './utils';

// =============================================================================
// Tests for cn() - CSS class name merging utility
// Combines clsx (conditional classes) with tailwind-merge (conflict resolution)
// =============================================================================

describe('cn', () => {
  // Basic functionality
  describe('basic functionality', () => {
    it('merges multiple class names', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('returns empty string for no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('handles a single class name', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });
  });

  // Conditional class handling (clsx functionality)
  describe('conditional classes', () => {
    it('handles conditional classes with true values', () => {
      const result = cn('base', { active: true, disabled: false });
      expect(result).toBe('base active');
    });

    it('handles conditional classes with false values', () => {
      const result = cn('base', { hidden: false });
      expect(result).toBe('base');
    });

    it('handles arrays of class names', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('handles mixed inputs', () => {
      const result = cn('base', ['array-class'], { conditional: true });
      expect(result).toBe('base array-class conditional');
    });

    it('handles undefined and null values', () => {
      const result = cn('valid', undefined, null, 'also-valid');
      expect(result).toBe('valid also-valid');
    });

    it('handles empty strings', () => {
      const result = cn('valid', '', 'also-valid');
      expect(result).toBe('valid also-valid');
    });

    it('handles false values', () => {
      const result = cn('valid', false, 'also-valid');
      expect(result).toBe('valid also-valid');
    });
  });

  // Tailwind merge functionality (conflict resolution)
  describe('Tailwind class merging', () => {
    it('resolves conflicting padding classes', () => {
      // tailwind-merge should keep only the last padding value
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('resolves conflicting margin classes', () => {
      const result = cn('m-2', 'm-4');
      expect(result).toBe('m-4');
    });

    it('resolves conflicting text color classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('resolves conflicting background color classes', () => {
      const result = cn('bg-white', 'bg-gray-100');
      expect(result).toBe('bg-gray-100');
    });

    it('preserves non-conflicting classes', () => {
      const result = cn('p-4', 'm-2', 'text-lg');
      expect(result).toBe('p-4 m-2 text-lg');
    });

    it('resolves conflicting width classes', () => {
      const result = cn('w-full', 'w-1/2');
      expect(result).toBe('w-1/2');
    });

    it('resolves flex direction conflicts', () => {
      const result = cn('flex-row', 'flex-col');
      expect(result).toBe('flex-col');
    });

    it('handles responsive variants', () => {
      // Different breakpoints should not conflict
      const result = cn('md:p-4', 'lg:p-6');
      expect(result).toBe('md:p-4 lg:p-6');
    });

    it('resolves same breakpoint conflicts', () => {
      const result = cn('md:p-4', 'md:p-6');
      expect(result).toBe('md:p-6');
    });
  });

  // Real-world usage patterns
  describe('real-world usage patterns', () => {
    it('handles component variant patterns', () => {
      const baseStyles = 'px-4 py-2 rounded';
      const variantStyles = 'bg-blue-500 text-white';
      const result = cn(baseStyles, variantStyles);
      expect(result).toBe('px-4 py-2 rounded bg-blue-500 text-white');
    });

    it('handles className prop override pattern', () => {
      // Common pattern: component has defaults, user provides overrides
      const defaultStyles = 'p-4 text-sm bg-white';
      const userOverrides = 'p-2 bg-gray-100';
      const result = cn(defaultStyles, userOverrides);
      // User overrides should win
      expect(result).toBe('text-sm p-2 bg-gray-100');
    });

    it('handles conditional variant pattern', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      expect(result).toBe('base-class active-class');
    });
  });
});

// =============================================================================
// Tests for formatCurrency() - Formats numbers as USD currency
// =============================================================================

describe('formatCurrency', () => {
  // Basic formatting
  describe('basic formatting', () => {
    it('formats positive integers', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('formats positive decimals', () => {
      expect(formatCurrency(99.99)).toBe('$99.99');
    });

    it('formats zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formats negative numbers', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });
  });

  // Decimal handling
  describe('decimal handling', () => {
    it('rounds to 2 decimal places (rounds up)', () => {
      expect(formatCurrency(10.999)).toBe('$11.00');
    });

    it('rounds to 2 decimal places (rounds down)', () => {
      expect(formatCurrency(10.991)).toBe('$10.99');
    });

    it('adds trailing zeros for whole numbers', () => {
      expect(formatCurrency(5)).toBe('$5.00');
    });

    it('adds trailing zero for single decimal', () => {
      expect(formatCurrency(5.5)).toBe('$5.50');
    });

    it('handles very small amounts', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
    });

    it('handles amounts less than a cent (rounds)', () => {
      expect(formatCurrency(0.001)).toBe('$0.00');
    });
  });

  // Large numbers
  describe('large numbers', () => {
    it('formats thousands with comma separators', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('formats millions with comma separators', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('formats billions with comma separators', () => {
      expect(formatCurrency(1000000000)).toBe('$1,000,000,000.00');
    });

    it('formats large numbers with decimals', () => {
      expect(formatCurrency(12345.67)).toBe('$12,345.67');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles very large negative numbers', () => {
      expect(formatCurrency(-999999.99)).toBe('-$999,999.99');
    });

    it('handles scientific notation input', () => {
      // 1e3 = 1000
      expect(formatCurrency(1e3)).toBe('$1,000.00');
    });

    it('handles floating point precision issues', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      expect(formatCurrency(0.1 + 0.2)).toBe('$0.30');
    });
  });
});

// =============================================================================
// Tests for formatNumber() - Formats numbers with thousands separators
// =============================================================================

describe('formatNumber', () => {
  // Basic formatting
  describe('basic formatting', () => {
    it('formats small numbers without separators', () => {
      expect(formatNumber(999)).toBe('999');
    });

    it('formats thousands with comma separator', () => {
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('formats millions with comma separators', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('formats billions with comma separators', () => {
      expect(formatNumber(1000000000)).toBe('1,000,000,000');
    });
  });

  // Zero and negative numbers
  describe('zero and negative numbers', () => {
    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('formats negative numbers', () => {
      expect(formatNumber(-500)).toBe('-500');
    });

    it('formats negative thousands', () => {
      expect(formatNumber(-1500)).toBe('-1,500');
    });

    it('formats negative millions', () => {
      expect(formatNumber(-1000000)).toBe('-1,000,000');
    });
  });

  // Decimal numbers
  describe('decimal numbers', () => {
    it('preserves decimal places', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    it('handles numbers with many decimal places', () => {
      // Intl.NumberFormat preserves decimals for regular number formatting
      expect(formatNumber(1234.567)).toBe('1,234.567');
    });

    it('handles small decimals', () => {
      expect(formatNumber(0.123)).toBe('0.123');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles scientific notation input', () => {
      // 1e6 = 1000000
      expect(formatNumber(1e6)).toBe('1,000,000');
    });

    it('handles very large numbers', () => {
      expect(formatNumber(999999999999)).toBe('999,999,999,999');
    });

    it('handles negative decimals', () => {
      expect(formatNumber(-12345.67)).toBe('-12,345.67');
    });
  });
});
