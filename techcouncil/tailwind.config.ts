import type { Config } from 'tailwindcss';

/**
 * TIS Tech Council tokens, modelled on a monochrome, shadowless system:
 * black and white surfaces that alternate section by section, whisper-light
 * display type with tight tracking, pill buttons, 20px cards. The only colour
 * is the petal gradient (the four colours of the council logo), used for the
 * announcement bar and card washes.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#000000',
        paper: '#FFFFFF',
        ash: '#F5F5F5',
        fog: '#BABABA', // muted text on black only (11:1)
        graphite: '#5C5C5C', // muted text on white (6.7:1)
        line: {
          dark: 'rgba(255,255,255,0.16)',
          light: 'rgba(0,0,0,0.12)',
        },
        danger: { dark: '#FF8A8A', light: '#C62828' },
        success: '#6FD3A0',
        // Redesign option A: Tashkent modernist building and its mosaic.
        concrete: { DEFAULT: '#CFC9BE', deep: '#B8B1A4', light: '#DED9CF' },
        ink: '#1C1A17',
        smalt: { orange: '#F29839', maroon: '#951E34', teal: '#07686E', cyan: '#0897B6', white: '#EFEBE3' },
        // Redesign option B: Tashkent metro.
        granite: { DEFAULT: '#16181B', light: '#22252A' },
        marble: { DEFAULT: '#ECE8E0', vein: '#D8D2C6' },
        brass: '#B08D57',
        vault: '#1D4F91',
        // Redesign option C: keynote stage.
        stage: { DEFAULT: '#050505', tile: '#111113', line: '#1D1D1F', text: '#F5F5F7', muted: '#A1A1A6' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        sign: ['"Unbounded Variable"', 'system-ui', 'sans-serif'],
        onest: ['"Onest Variable"', 'system-ui', 'sans-serif'],
        station: ['"Big Shoulders Display Variable"', 'system-ui', 'sans-serif'],
        geist: ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.5', letterSpacing: '-0.015em' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '-0.015em' }],
        body: ['16px', { lineHeight: '1.5', letterSpacing: '-0.02em' }],
        'body-lg': ['18px', { lineHeight: '1.5', letterSpacing: '-0.037em' }],
        subheading: ['24px', { lineHeight: '1.2', letterSpacing: '-0.05em' }],
        'heading-sm': ['32px', { lineHeight: '1.15', letterSpacing: '-0.06em' }],
      },
      borderRadius: {
        card: '20px',
        pill: '80px',
        nav: '16px',
      },
      backgroundImage: {
        petal: 'linear-gradient(90deg, #F29839, #951E34 30%, #07686E 65%, #0897B6 100%)',
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
