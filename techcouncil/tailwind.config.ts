import type { Config } from 'tailwindcss';

/**
 * TIS Tech Council tokens, following the TIS Visual Standards Manual (2020):
 * the six brand colours only (turquoise first; green and apricot second; dark
 * blue, deep teal and deep red third), Nunito Sans as the web stand-in for
 * Avenir Next, and the brand's colour blocks and arch shapes. Dark surfaces
 * are the brand's dark blue rather than black; light ones are white. Pill
 * buttons and 20px cards stay from the original design.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black ink with a trace of the brand's dark blue: every dark surface, and the text on light ones.
        obsidian: '#11161C',
        paper: '#FFFFFF',
        ash: '#F3F6F8',
        fog: '#C5CDD6', // muted text on dark blue (7.6:1)
        graphite: '#55606C', // muted text on white (6.5:1)
        line: {
          dark: 'rgba(255,255,255,0.18)',
          light: 'rgba(43,55,68,0.14)',
        },
        danger: { dark: '#F2942C', light: '#9C1B30' },
        success: '#A0C13B',
        // TIS Visual Standards Manual, 2.2 Color Breakdowns.
        tis: {
          turquoise: '#009CB9', // primary
          green: '#A0C13B', // secondary
          apricot: '#F2942C', // secondary
          blue: '#2B3744', // tertiary
          teal: '#006B6E', // tertiary
          red: '#9C1B30', // tertiary
        },
      },
      fontFamily: {
        // Avenir Next is the brand font; the manual names Nunito Sans for the web, then Lato.
        sans: ['"Nunito Sans Variable"', '"Nunito Sans"', '"Avenir Next"', 'Lato', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.5', letterSpacing: '0.005em' }],
        'body-sm': ['14px', { lineHeight: '1.55', letterSpacing: '0' }],
        body: ['16px', { lineHeight: '1.55', letterSpacing: '-0.005em' }],
        'body-lg': ['18px', { lineHeight: '1.55', letterSpacing: '-0.01em' }],
        subheading: ['24px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'heading-sm': ['32px', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        card: '20px',
        pill: '80px',
        nav: '16px',
      },
      backgroundImage: {
        // The rosette's petal colours, in the manual's exact values, as four hard-edged tiles (no blending).
        petal: 'linear-gradient(90deg, #F2942C 0 25%, #9C1B30 25% 50%, #006B6E 50% 75%, #009CB9 75% 100%)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        marquee: { to: { transform: 'translate3d(-50%,0,0)' } },
      },
      animation: {
        marquee: 'marquee var(--marquee-duration, 50s) linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
