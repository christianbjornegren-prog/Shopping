/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Refined, slightly cooler slate-dark scale (replaces the flat grays).
        // gray-750 / gray-850 are now real shades the UI already referenced.
        gray: {
          400: '#9aa4b2',
          500: '#6b7480',
          600: '#3b4250',
          700: '#2a303c',
          750: '#222834',
          800: '#1b202a',
          850: '#151a22',
          900: '#0e1218',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
}
