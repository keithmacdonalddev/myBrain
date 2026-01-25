import { describe, it, expect, vi, beforeEach } from 'vitest';
import themeReducer, {
  setThemeMode,
  updateEffectiveTheme,
  setAccentColor,
  setReduceMotion,
  setGlassIntensity,
  toggleTheme,
  setTheme,
  selectThemeMode,
  selectEffectiveTheme,
  selectAccentColor,
  selectReduceMotion,
  selectGlassIntensity,
  ACCENT_COLORS,
  GLASS_INTENSITIES,
} from './themeSlice';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document.documentElement
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};
Object.defineProperty(document, 'documentElement', {
  value: { classList: mockClassList },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('themeSlice', () => {
  // Note: Initial state depends on localStorage values. Since we mock localStorage
  // to return null/undefined, getInitialMode returns 'system', and since matchMedia
  // returns matches=true for dark, effectiveTheme becomes 'dark'.
  const testInitialState = {
    mode: 'system',
    effectiveTheme: 'dark',
    accentColor: 'blue',
    reduceMotion: false,
    glassIntensity: 'medium',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('constants', () => {
    it('should export ACCENT_COLORS with valid structure', () => {
      expect(ACCENT_COLORS).toBeInstanceOf(Array);
      expect(ACCENT_COLORS.length).toBeGreaterThan(0);

      ACCENT_COLORS.forEach(color => {
        expect(color).toHaveProperty('id');
        expect(color).toHaveProperty('label');
        expect(color).toHaveProperty('lightColor');
        expect(color).toHaveProperty('darkColor');
      });
    });

    it('should export GLASS_INTENSITIES with valid structure', () => {
      expect(GLASS_INTENSITIES).toBeInstanceOf(Array);
      expect(GLASS_INTENSITIES.length).toBe(3);

      GLASS_INTENSITIES.forEach(intensity => {
        expect(intensity).toHaveProperty('id');
        expect(intensity).toHaveProperty('label');
      });
    });

    it('should have blue as the first accent color', () => {
      expect(ACCENT_COLORS[0].id).toBe('blue');
    });

    it('should have low, medium, high glass intensities', () => {
      const ids = GLASS_INTENSITIES.map(g => g.id);
      expect(ids).toContain('low');
      expect(ids).toContain('medium');
      expect(ids).toContain('high');
    });
  });

  describe('reducers', () => {
    describe('setThemeMode', () => {
      it('should set mode to light', () => {
        const state = themeReducer(testInitialState, setThemeMode('light'));

        expect(state.mode).toBe('light');
        expect(state.effectiveTheme).toBe('light');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('themeMode', 'light');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('theme');
      });

      it('should set mode to dark', () => {
        const state = themeReducer({ ...testInitialState, mode: 'light', effectiveTheme: 'light' }, setThemeMode('dark'));

        expect(state.mode).toBe('dark');
        expect(state.effectiveTheme).toBe('dark');
      });

      it('should set mode to system', () => {
        const state = themeReducer({ ...testInitialState, mode: 'light' }, setThemeMode('system'));

        expect(state.mode).toBe('system');
        // effectiveTheme depends on system preference (mocked as dark)
        expect(state.effectiveTheme).toBe('dark');
      });

      it('should ignore invalid mode values', () => {
        const state = themeReducer(testInitialState, setThemeMode('invalid'));

        expect(state.mode).toBe('system');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    describe('updateEffectiveTheme', () => {
      it('should update effectiveTheme when mode is system', () => {
        const systemModeState = {
          ...testInitialState,
          mode: 'system',
          effectiveTheme: 'light',
        };

        const state = themeReducer(systemModeState, updateEffectiveTheme());

        // Since matchMedia is mocked to return true for dark preference
        expect(state.effectiveTheme).toBe('dark');
      });

      it('should not change effectiveTheme when mode is not system', () => {
        const lightModeState = {
          ...testInitialState,
          mode: 'light',
          effectiveTheme: 'light',
        };

        const state = themeReducer(lightModeState, updateEffectiveTheme());

        expect(state.effectiveTheme).toBe('light');
      });
    });

    describe('setAccentColor', () => {
      it('should set valid accent color', () => {
        const state = themeReducer(testInitialState, setAccentColor('purple'));

        expect(state.accentColor).toBe('purple');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('accentColor', 'purple');
      });

      it('should apply document classes for accent color', () => {
        themeReducer(testInitialState, setAccentColor('green'));

        // Should remove old accent classes and add new one
        expect(mockClassList.add).toHaveBeenCalledWith('accent-green');
      });

      it('should ignore invalid accent color', () => {
        const state = themeReducer(testInitialState, setAccentColor('invalid-color'));

        expect(state.accentColor).toBe('blue');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should set each valid accent color', () => {
        ACCENT_COLORS.forEach(color => {
          const state = themeReducer(testInitialState, setAccentColor(color.id));
          expect(state.accentColor).toBe(color.id);
        });
      });
    });

    describe('setReduceMotion', () => {
      it('should enable reduce motion', () => {
        const state = themeReducer(testInitialState, setReduceMotion(true));

        expect(state.reduceMotion).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('reduceMotion', 'true');
      });

      it('should disable reduce motion', () => {
        const stateWithMotion = { ...testInitialState, reduceMotion: true };
        const state = themeReducer(stateWithMotion, setReduceMotion(false));

        expect(state.reduceMotion).toBe(false);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('reduceMotion', 'false');
      });

      it('should coerce truthy values to boolean', () => {
        const state = themeReducer(testInitialState, setReduceMotion(1));

        expect(state.reduceMotion).toBe(true);
      });

      it('should coerce falsy values to boolean', () => {
        const state = themeReducer({ ...testInitialState, reduceMotion: true }, setReduceMotion(0));

        expect(state.reduceMotion).toBe(false);
      });
    });

    describe('setGlassIntensity', () => {
      it('should set valid glass intensity', () => {
        const state = themeReducer(testInitialState, setGlassIntensity('high'));

        expect(state.glassIntensity).toBe('high');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('glassIntensity', 'high');
      });

      it('should ignore invalid glass intensity', () => {
        const state = themeReducer(testInitialState, setGlassIntensity('invalid'));

        expect(state.glassIntensity).toBe('medium');
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });

      it('should set each valid glass intensity', () => {
        GLASS_INTENSITIES.forEach(intensity => {
          const state = themeReducer(testInitialState, setGlassIntensity(intensity.id));
          expect(state.glassIntensity).toBe(intensity.id);
        });
      });
    });

    describe('toggleTheme', () => {
      it('should toggle from dark to light', () => {
        const darkState = { ...testInitialState, effectiveTheme: 'dark' };
        const state = themeReducer(darkState, toggleTheme());

        expect(state.mode).toBe('light');
        expect(state.effectiveTheme).toBe('light');
      });

      it('should toggle from light to dark', () => {
        const lightState = { ...testInitialState, mode: 'light', effectiveTheme: 'light' };
        const state = themeReducer(lightState, toggleTheme());

        expect(state.mode).toBe('dark');
        expect(state.effectiveTheme).toBe('dark');
      });

      it('should persist toggled theme to localStorage', () => {
        themeReducer({ ...testInitialState, effectiveTheme: 'dark' }, toggleTheme());

        expect(localStorageMock.setItem).toHaveBeenCalledWith('themeMode', 'light');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('theme');
      });
    });

    describe('setTheme (legacy)', () => {
      it('should behave like setThemeMode for backwards compatibility', () => {
        const state = themeReducer(testInitialState, setTheme('light'));

        expect(state.mode).toBe('light');
        expect(state.effectiveTheme).toBe('light');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('themeMode', 'light');
      });

      it('should ignore invalid values', () => {
        const state = themeReducer(testInitialState, setTheme('invalid'));

        expect(state.mode).toBe('system');
      });
    });
  });

  describe('selectors', () => {
    const mockState = {
      theme: {
        mode: 'dark',
        effectiveTheme: 'dark',
        accentColor: 'purple',
        reduceMotion: true,
        glassIntensity: 'high',
      },
    };

    it('selectThemeMode should return mode', () => {
      expect(selectThemeMode(mockState)).toBe('dark');
    });

    it('selectEffectiveTheme should return effectiveTheme', () => {
      expect(selectEffectiveTheme(mockState)).toBe('dark');
    });

    it('selectAccentColor should return accentColor', () => {
      expect(selectAccentColor(mockState)).toBe('purple');
    });

    it('selectReduceMotion should return reduceMotion', () => {
      expect(selectReduceMotion(mockState)).toBe(true);
    });

    it('selectGlassIntensity should return glassIntensity', () => {
      expect(selectGlassIntensity(mockState)).toBe('high');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined state gracefully', () => {
      const state = themeReducer(undefined, { type: 'unknown' });

      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('effectiveTheme');
      expect(state).toHaveProperty('accentColor');
      expect(state).toHaveProperty('reduceMotion');
      expect(state).toHaveProperty('glassIntensity');
    });

    it('should handle unknown action types', () => {
      const state = themeReducer(testInitialState, { type: 'unknown/action' });

      expect(state).toEqual(testInitialState);
    });

    it('should handle null payload for setAccentColor', () => {
      const state = themeReducer(testInitialState, setAccentColor(null));

      expect(state.accentColor).toBe('blue');
    });

    it('should handle undefined payload for setGlassIntensity', () => {
      const state = themeReducer(testInitialState, setGlassIntensity(undefined));

      expect(state.glassIntensity).toBe('medium');
    });
  });
});
