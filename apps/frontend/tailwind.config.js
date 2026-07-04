/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  important: '#root',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          500: '#2196f3',
          700: '#1976d2',
          900: '#0d47a1',
        },
      },
      screens: {
        xs: '320px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
