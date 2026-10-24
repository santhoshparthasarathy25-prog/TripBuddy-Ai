/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#0F172A',
          900: '#0B1120',
        },
        teal: {
          500: '#0D9488',
          600: '#0F766E',
        },
        sky: {
          400: '#38BDF8',
          500: '#0EA5E9',
        },
      },
    },
  },
  plugins: [],
};
