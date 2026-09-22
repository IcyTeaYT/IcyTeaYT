import type { Config } from 'tailwindcss';

/**
 * TISMUN design tokens.
 * Colours are sampled from the conference logo: the teal of the Uzbekistan map
 * and the dark slate of the serif wordmark. Teal is the ONLY accent colour —
 * everything else is ink on warm off-white.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#EEF9FC',
          100: '#D5F0F6',
          200: '#ACE1EC',
          300: '#76CBDE',
          400: '#3FB1CC',
          500: '#0E9AB7', // primary brand teal
          600: '#0C7F98',
          700: '#0D6678',
          800: '#105362',
          900: '#124553',
        },
        ink: {
          50: '#F4F5F7',
          100: '#E7E9ED',
          200: '#CFD3DA',
          300: '#AEB4BF',
          400: '#7C8494',
          500: '#5A6373',
          600: '#434C5C',
          700: '#364052',
          800: '#2B3544', // wordmark slate
          900: '#1D2532',
          950: '#141A24',
        },
        canvas: '#FAFAF8', // warm off-white page background
        surface: '#FFFFFF',
        hairline: '#E4E7EB',
        muted: '#6B7280',
        success: { DEFAULT: '#2F7D5C', soft: '#EAF5EF', border: '#BFDFCF' },
        warning: { DEFAULT: '#B4761B', soft: '#FBF3E4', border: '#EBD5A8' },
        danger: { DEFAULT: '#B4443C', soft: '#FBEDEC', border: '#EFC6C2' },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        control: '8px', // buttons, inputs, chips
        card: '12px', // cards, panels, modals
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 35, 48, 0.04), 0 1px 3px rgba(27, 35, 48, 0.03)',
        raised: '0 2px 4px rgba(27, 35, 48, 0.05), 0 6px 16px rgba(27, 35, 48, 0.06)',
        modal: '0 12px 40px rgba(20, 26, 36, 0.18)',
        focus: '0 0 0 3px rgba(14, 154, 183, 0.18)',
      },
      letterSpacing: {
        label: '0.08em', // uppercase micro-labels: COMMITTEE, DELEGATION
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'logo-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'logo-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.015)' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { opacity: '0.25' },
          '40%': { opacity: '1' },
        },
        'time-up': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out both',
        'fade-up': 'fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'logo-in': 'logo-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'logo-pulse': 'logo-pulse 2600ms ease-in-out 600ms infinite',
        'dot-bounce': 'dot-bounce 1400ms ease-in-out infinite',
        'time-up': 'time-up 1600ms ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
