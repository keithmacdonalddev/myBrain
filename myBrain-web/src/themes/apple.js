/**
 * Apple Command Center Theme
 * iOS/macOS inspired design language
 */
const appleTheme = {
  id: 'apple',
  name: 'Apple Command Center',
  description: 'Clean, iOS-inspired productivity interface',

  features: {
    glassmorphism: true,
    activityRings: true,
    gridOverlay: false,
    navigationRail: false,
  },

  typography: {
    fontPrimary: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
    fontMono: '"SF Mono", ui-monospace, SFMono-Regular, monospace',
    fontDisplay: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  },

  componentStyle: 'rounded', // 'rounded' | 'sharp' | 'squircle'
};

export default appleTheme;
