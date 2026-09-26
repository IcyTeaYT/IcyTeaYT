import type { Config } from 'tailwindcss';

/**
 * TIS Tech Council tokens. The four petals of the council logo are the colour
 * system: each one is a flat field and a key (categories, projects, founders),
 * never a glow. The ground is the logo's navy, deepened for a dark page.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: '#0A0F17',
          800: '#0F1622',
          700: '#151E2D',
          600: '#1D283A',
          500: '#2A3850',
        },
        paper: '#EEF1F5',
        fog: {
          200: '#C6CEDA', // secondary text, 11:1 on night
          300: '#9DA8B9', // tertiary text, 7.3:1 on night
          400: '#7F8A9D', // quiet text, 5.3:1 on night
        },
        // Petal colours. `DEFAULT` is the logo value (for fills), `ink` is the
        // same hue lifted so it reads as text or a line on the night ground.
        orange: { DEFAULT: '#F29839', ink: '#F6AC5C', deep: '#C9711A' },
        maroon: { DEFAULT: '#951E34', ink: '#E0647C', deep: '#6E1426' },
        teal: { DEFAULT: '#07686E', ink: '#3FB8AF', deep: '#044A4F' },
        cyan: { DEFAULT: '#0897B6', ink: '#4CC6E2', deep: '#066E86' },
        // Syntax colours for code windows, drawn from the petals.
        syntax: {
          keyword: '#E0647C',
          string: '#F6AC5C',
          fn: '#4CC6E2',
          number: '#3FB8AF',
          comment: '#7F8A9D',
          plain: '#C6CEDA',
        },
        success: '#58C39A',
        danger: '#F07A86',
      },
      fontFamily: {
        display: ['"Clash Display"', '"Inter Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // The council's code voice: paths, terminal lines, code windows and live data.
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        display: '-0.035em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(120%)' } },
        'border-spin': { to: { '--angle': '360deg' } },
        ping: { '75%,100%': { transform: 'scale(2.2)', opacity: '0' } },
        // Ends visible, so reduced motion (one instant iteration) leaves the caret on.
        blink: { '0%, 45%': { opacity: '1' }, '50%, 95%': { opacity: '0' }, '100%': { opacity: '1' } },
        marquee: { to: { transform: 'translate3d(-50%,0,0)' } },
        'marquee-rev': { from: { transform: 'translate3d(-50%,0,0)' }, to: { transform: 'translate3d(0,0,0)' } },
      },
      animation: {
        shimmer: 'shimmer 3.2s cubic-bezier(0.4,0,0.2,1) infinite',
        'border-spin': 'border-spin 8s linear infinite',
        ping: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite',
        blink: 'blink 1.1s linear infinite',
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite',
        'marquee-rev': 'marquee-rev var(--marquee-duration, 40s) linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
