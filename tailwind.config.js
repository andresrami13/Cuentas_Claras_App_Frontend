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
        // Colores de tema (variables CSS definidas en styles.css por cada .theme-*)
        accent: {
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          deep: 'rgb(var(--accent-deep) / <alpha-value>)',
        },
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Tokens semánticos para soportar fondo claro: 'ink' = texto principal,
        // 'veil' = velo translúcido de tarjetas/bordes. En temas oscuros ambos
        // son blancos (idéntico al diseño previo); en temas claros, oscuros.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        veil: 'rgb(var(--veil) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
