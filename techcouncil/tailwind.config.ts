import type { Config } from 'tailwindcss';

/**
 * TIS Tech Council design tokens.
 * Dark-first. `ink` is the near-black navy base, `tis` is the school blue used
 * for glows, `volt` is the single electric accent. Logo colours (petal orange,
 * crimson, teal, cyan) appear only in the logo itself and brand moments.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04060C',
          900: '#070B16',
          850: '#0A1020',
          800: '#0E1629',
          700: '#152036',
          600: '#1E2B45',
          500: '#2B3A57',
        },
        tis: {
          100: '#DCE8FF',
          200: '#B7CFFF',
          300: '#8AB2FF',
          400: '#5B91FF',
          500: '#2F6FF5',
          600: '#1F56D6',
          700: '#1A44A8',
        },
        volt: {
          300: '#8CF3FF',
          400: '#4DE8FA',
          500: '#18D4EE',
          600: '#0BA9C2',
        },
        petal: {
          orange: '#F29839',
          red: '#951E34',
          teal: '#07686E',
          cyan: '#0897B6',
        },
        mist: {
          50: '#F5F8FF',
          100: '#E6ECF7',
          200: '#C9D3E6',
          300: '#A4B1CC',
          400: '#7C8AA8',
          500: '#5C6A88',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', '"Inter Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        label: '0.14em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        marquee: { to: { transform: 'translate3d(-50%,0,0)' } },
        'marquee-rev': { from: { transform: 'translate3d(-50%,0,0)' }, to: { transform: 'translate3d(0,0,0)' } },
        shimmer: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(120%)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
        'border-spin': { to: { '--angle': '360deg' } },
        pulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        ping: { '75%,100%': { transform: 'scale(2.2)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shine: { to: { backgroundPosition: '200% center' } },
      },
      animation: {
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite',
        'marquee-rev': 'marquee-rev var(--marquee-duration, 40s) linear infinite',
        shimmer: 'shimmer 2.6s cubic-bezier(0.4,0,0.2,1) infinite',
        'spin-slow': 'spin 14s linear infinite',
        'border-spin': 'border-spin 6s linear infinite',
        ping: 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
        float: 'float 5s ease-in-out infinite',
        shine: 'shine 6s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
