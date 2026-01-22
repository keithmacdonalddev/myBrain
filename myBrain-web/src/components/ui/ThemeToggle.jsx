import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme, selectEffectiveTheme } from '../../store/themeSlice';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const dispatch = useDispatch();
  const effectiveTheme = useSelector(selectEffectiveTheme);

  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      className={`
        p-2 rounded-lg border border-border bg-bg hover:bg-panel transition-colors
        ${className}
      `}
      title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
