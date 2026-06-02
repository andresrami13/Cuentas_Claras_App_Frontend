/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        carbon: '#1C2833',
        slate: '#2E4057',
        gold: '#D4A017',
        'amber-gold': '#F0C040',
        income: '#28B463',
        expense: '#CB4335',
        background: '#F2F3F4',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
