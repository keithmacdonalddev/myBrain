/**
 * Theme Registry
 * Exports all available themes and theme utilities
 */
export { default as appleTheme } from './apple';
// Future: export { default as missionControlTheme } from './mission-control';
// Future: export { default as materialTheme } from './material';

export const themeRegistry = {
  apple: () => import('./apple'),
  // 'mission-control': () => import('./mission-control'),
  // 'material': () => import('./material'),
};
