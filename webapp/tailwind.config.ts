/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          board: 'var(--color-bg-board)',
        },
        board: {
          light: '#f5f7fb',
          dark: '#1a1f2b',
        },
        stone: {
          black: 'var(--color-stone-black)',
          white: 'var(--color-stone-white)',
        },
        accent: 'var(--color-accent)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      },
      animation: {
        'pulse-win': 'pulse-win 1s ease-in-out infinite',
        'ping-dot': 'ping-dot 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-win': {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)',
          },
          '50%': {
            transform: 'scale(1.1)',
            boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)',
          },
        },
        'ping-dot': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.5',
            transform: 'scale(0.8)',
          },
        },
      },
    },
  },
  plugins: [],
};
