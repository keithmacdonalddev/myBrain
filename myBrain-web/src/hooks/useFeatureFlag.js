import { useSelector } from 'react-redux';

/**
 * Hook to check if a user has a specific feature flag enabled
 *
 * @param {string} flagName - The name of the feature flag (e.g., 'fitnessEnabled')
 * @returns {boolean} - Whether the flag is enabled for the current user
 *
 * @example
 * const hasFitness = useFeatureFlag('fitnessEnabled');
 * if (hasFitness) {
 *   // Show fitness feature
 * }
 */
export function useFeatureFlag(flagName) {
  const { user } = useSelector((state) => state.auth);

  if (!user || !user.flags) {
    return false;
  }

  // Handle both Map and plain object formats
  if (user.flags instanceof Map) {
    return user.flags.get(flagName) === true;
  }

  return user.flags[flagName] === true;
}

/**
 * Hook to check multiple feature flags at once
 *
 * @param {string[]} flagNames - Array of feature flag names
 * @returns {Object} - Object with flag names as keys and boolean values
 *
 * @example
 * const flags = useFeatureFlags(['fitnessEnabled', 'kbEnabled']);
 * // { 'fitnessEnabled': true, 'kbEnabled': false }
 */
export function useFeatureFlags(flagNames) {
  const { user } = useSelector((state) => state.auth);

  if (!user || !user.flags) {
    return flagNames.reduce((acc, name) => {
      acc[name] = false;
      return acc;
    }, {});
  }

  return flagNames.reduce((acc, name) => {
    if (user.flags instanceof Map) {
      acc[name] = user.flags.get(name) === true;
    } else {
      acc[name] = user.flags[name] === true;
    }
    return acc;
  }, {});
}

/**
 * Hook to check if user is admin
 * @returns {boolean}
 */
export function useIsAdmin() {
  const { user } = useSelector((state) => state.auth);
  return user?.role === 'admin';
}

export default useFeatureFlag;
