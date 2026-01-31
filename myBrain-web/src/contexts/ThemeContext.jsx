/**
 * ThemeContext - Multi-theme support for dashboard
 *
 * Manages theme selection beyond just light/dark mode.
 * Supports multiple theme profiles (apple, mission-control, material).
 * Works alongside existing themeSlice.js for mode (light/dark/system).
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectEffectiveTheme } from '../store/themeSlice';

const ThemeContext = createContext(null);

// Available themes
export const THEMES = {
  APPLE: 'apple',
  MISSION_CONTROL: 'mission-control',
  MATERIAL: 'material',
};

export function ThemeProvider({ children }) {
  const dispatch = useDispatch();
  const effectiveTheme = useSelector(selectEffectiveTheme);
  const [themeId, setThemeId] = useState(() => {
    // Load from localStorage or default to 'apple'
    return localStorage.getItem('dashboard-theme-id') || THEMES.APPLE;
  });

  // Apply theme ID to document
  useEffect(() => {
    document.documentElement.setAttribute('data-dashboard-theme', themeId);
    localStorage.setItem('dashboard-theme-id', themeId);
  }, [themeId]);

  const value = {
    themeId,
    setThemeId,
    effectiveTheme, // 'light' or 'dark'
    isApple: themeId === THEMES.APPLE,
    isMissionControl: themeId === THEMES.MISSION_CONTROL,
    isMaterial: themeId === THEMES.MATERIAL,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
