import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#1a1f2e',
          50: '#f5f6f8',
          100: '#e8eaef',
          200: '#cbd0db',
          300: '#a3acbf',
          400: '#778298',
          500: '#5b667d',
          600: '#475168',
          700: '#3a4255',
          800: '#2c3245',
          900: '#1a1f2e',
        },
        slate: {
          DEFAULT: '#91a1ba',
        },
        charcoal: {
          DEFAULT: '#353535',
        },
        cream: '#fafaf7',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        widest: '0.18em',
      },
    },
  },
  plugins: [],
} satisfies Config
