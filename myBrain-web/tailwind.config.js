/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom colors using CSS variables
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          hover: 'var(--danger-hover)',
        },
        success: {
          DEFAULT: 'var(--success)',
          hover: 'var(--success-hover)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
        },
      },
    },
  },
  plugins: [],
}
