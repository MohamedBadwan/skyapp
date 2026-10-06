import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Flight Deck" — azul aeronáutico
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b6d8ff',
          300: '#84bbff',
          400: '#4a94ff',
          500: '#1e6dff',
          600: '#0b4fdb',
          700: '#0a3ea8',
          800: '#0d3585',
          900: '#0f2f6b',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial'],
      },
    },
  },
  plugins: [],
};

export default config;
