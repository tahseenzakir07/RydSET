/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rydset': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#abea93',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#152822',
          700: '#111f1a',
          800: '#0d1814',
          900: '#080f0d',
        },
        'accent': {
          DEFAULT: '#abea93',
          light: '#dcfce7',
          dark: '#152822',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
