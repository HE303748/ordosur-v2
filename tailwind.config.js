/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── OrdoSur Brand Palette ────────────────────────────────────────────
        // Text / dark backgrounds
        'ink-navy':      '#0A1628',
        'ink-navy-soft': '#1A2B42',
        'ink-muted':     '#475569',
        'ink-faint':     '#94A3B8',

        // Brand accent
        'medical-green':      '#00A86B',
        'medical-green-soft': '#E6F4EE',
        'medical-green-deep': '#006B47',

        // Backgrounds
        'paper':      '#FAFAF7',
        'paper-pure': '#FFFFFF',

        // Alerts
        'alert-red':      '#DC2626',
        'alert-red-soft': '#FEF2F2',

        // Structural
        'divider': '#E5E5E0',

        // ── Legacy scales (kept for backward compat — migrate at Sprint #2) ──
        primary: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#0066CC',
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },
        secondary: {
          50: '#e6f7f7',
          100: '#ccefef',
          200: '#99dfdf',
          300: '#66cfcf',
          400: '#33bfbf',
          500: '#00A8A8',
          600: '#008686',
          700: '#006565',
          800: '#004343',
          900: '#002222',
        },
        safe: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        caution: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glass':   '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'medical': '0 4px 20px rgba(0, 168, 107, 0.12)',
        'brand':   '0 0 0 2px rgba(0, 168, 107, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
