import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7fafb',
          100: '#eef4f6',
          200: '#d9e4e8',
          300: '#b2c3ca',
          400: '#7d97a2',
          500: '#56707b',
          600: '#40555f',
          700: '#314048',
          800: '#212c31',
          900: '#10181c',
          950: '#071014'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.22)'
      },
      backgroundImage: {
        'portal-gradient': 'radial-gradient(circle at top left, rgba(16,185,129,0.2), transparent 34%), radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 28%), linear-gradient(180deg, #071014 0%, #09151a 35%, #0d1820 100%)'
      }
    }
  },
  plugins: []
};

export default config;