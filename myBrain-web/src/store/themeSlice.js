import { createSlice } from '@reduxjs/toolkit';

// Valid accent colors with their CSS class names
export const ACCENT_COLORS = [
  { id: 'blue', label: 'Blue', lightColor: '#3b82f6', darkColor: '#60a5fa' },
  { id: 'purple', label: 'Purple', lightColor: '#8b5cf6', darkColor: '#a78bfa' },
  { id: 'green', label: 'Green', lightColor: '#10b981', darkColor: '#34d399' },
  { id: 'orange', label: 'Orange', lightColor: '#f59e0b', darkColor: '#fbbf24' },
  { id: 'pink', label: 'Pink', lightColor: '#ec4899', darkColor: '#f472b6' },
  { id: 'teal', label: 'Teal', lightColor: '#14b8a6', darkColor: '#2dd4bf' },
];

// Glass intensity options (IN-PROGRESS: revisit after real usage)
// TODO: Confirm default intensity after a week of usage across roles/screens.
export const GLASS_INTENSITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

// Get initial theme mode from localStorage (light, dark, or system)
const getInitialMode = () => {
  if (typeof window === 'undefined') return 'dark';

  const stored = localStorage.getItem('themeMode');
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored;
  }

  // Legacy support: check old 'theme' key
  const legacyTheme = localStorage.getItem('theme');
  if (legacyTheme && ['light', 'dark'].includes(legacyTheme)) {
    return legacyTheme;
  }

  return 'system'; // Default to system
};

// Get initial accent color from localStorage
const getInitialAccentColor = () => {
  if (typeof window === 'undefined') return 'blue';

  const stored = localStorage.getItem('accentColor');
  if (stored && ACCENT_COLORS.some(c => c.id === stored)) {
    return stored;
  }

  return 'blue'; // Default accent
};

// Get initial glass intensity from localStorage
const getInitialGlassIntensity = () => {
  if (typeof window === 'undefined') return 'medium';

  const stored = localStorage.getItem('glassIntensity');
  if (stored && GLASS_INTENSITIES.some(g => g.id === stored)) {
    return stored;
  }

  return 'medium'; // Default glass intensity
};

// Get initial reduce motion preference
const getInitialReduceMotion = () => {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem('reduceMotion');
  if (stored !== null) {
    return stored === 'true';
  }

  // Default to OS preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Determine effective theme (light or dark) based on mode
const getEffectiveTheme = (mode) => {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

const initialState = {
  mode: getInitialMode(), // 'light', 'dark', or 'system'
  effectiveTheme: getEffectiveTheme(getInitialMode()), // actual applied theme
  accentColor: getInitialAccentColor(),
  reduceMotion: getInitialReduceMotion(),
  glassIntensity: getInitialGlassIntensity(),
};

// Apply theme to document
const applyThemeToDocument = (effectiveTheme, accentColor, reduceMotion, glassIntensity) => {
  const root = document.documentElement;

  // Apply dark/light mode
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply accent color (remove old, add new)
  ACCENT_COLORS.forEach(color => {
    root.classList.remove(`accent-${color.id}`);
  });
  root.classList.add(`accent-${accentColor}`);

  // Apply glass intensity
  GLASS_INTENSITIES.forEach(level => {
    root.classList.remove(`glass-${level.id}`);
  });
  root.classList.add(`glass-${glassIntensity}`);

  // Apply reduce motion
  if (reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    // Set theme mode (light, dark, or system)
    setThemeMode: (state, action) => {
      const mode = action.payload;
      if (!['light', 'dark', 'system'].includes(mode)) return;

      state.mode = mode;
      state.effectiveTheme = getEffectiveTheme(mode);

      localStorage.setItem('themeMode', mode);
      // Remove legacy key
      localStorage.removeItem('theme');

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },

    // Update effective theme when system preference changes
    updateEffectiveTheme: (state) => {
      if (state.mode === 'system') {
        state.effectiveTheme = getEffectiveTheme('system');
        applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
      }
    },

    // Set accent color
    setAccentColor: (state, action) => {
      const color = action.payload;
      if (!ACCENT_COLORS.some(c => c.id === color)) return;

      state.accentColor = color;
      localStorage.setItem('accentColor', color);

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },

    // Set reduce motion preference
    setReduceMotion: (state, action) => {
      state.reduceMotion = !!action.payload;
      localStorage.setItem('reduceMotion', state.reduceMotion.toString());

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },

    // Set glass intensity
    setGlassIntensity: (state, action) => {
      const level = action.payload;
      if (!GLASS_INTENSITIES.some(g => g.id === level)) return;

      state.glassIntensity = level;
      localStorage.setItem('glassIntensity', level);

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },

    // Legacy: toggle between light and dark (for ThemeToggle component)
    toggleTheme: (state) => {
      const newMode = state.effectiveTheme === 'dark' ? 'light' : 'dark';
      state.mode = newMode;
      state.effectiveTheme = newMode;

      localStorage.setItem('themeMode', newMode);
      localStorage.removeItem('theme');

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },

    // Legacy: setTheme for backwards compatibility
    setTheme: (state, action) => {
      const mode = action.payload;
      if (!['light', 'dark', 'system'].includes(mode)) return;

      state.mode = mode;
      state.effectiveTheme = getEffectiveTheme(mode);

      localStorage.setItem('themeMode', mode);
      localStorage.removeItem('theme');

      applyThemeToDocument(state.effectiveTheme, state.accentColor, state.reduceMotion, state.glassIntensity);
    },
  },
});

export const {
  setThemeMode,
  updateEffectiveTheme,
  setAccentColor,
  setReduceMotion,
  setGlassIntensity,
  toggleTheme,
  setTheme,
} = themeSlice.actions;

// Initialize theme on page load and set up system preference listener
export const initializeTheme = () => (dispatch, getState) => {
  const { mode, accentColor, reduceMotion, glassIntensity } = getState().theme;
  const effectiveTheme = getEffectiveTheme(mode);

  applyThemeToDocument(effectiveTheme, accentColor, reduceMotion, glassIntensity);

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      dispatch(updateEffectiveTheme());
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy Safari
      mediaQuery.addListener(handleChange);
    }
  }
};

// Selectors
export const selectThemeMode = (state) => state.theme.mode;
export const selectEffectiveTheme = (state) => state.theme.effectiveTheme;
export const selectAccentColor = (state) => state.theme.accentColor;
export const selectReduceMotion = (state) => state.theme.reduceMotion;
export const selectGlassIntensity = (state) => state.theme.glassIntensity;

export default themeSlice.reducer;
