/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background hierarchy
        bg: {
          DEFAULT: '#F7F3EF',
          secondary: '#F0EBE4',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FCF9F6',
          hover: '#F5F0EA',
        },
        // Borders
        border: {
          DEFAULT: '#E4DAD2',
          hover: '#D1C5B8',
        },
        // Text hierarchy
        text: {
          primary: '#292323',
          secondary: '#665C5C',
          muted: '#8C8282',
          disabled: '#A89E9E',
        },
        // Primary brand (burgundy)
        primary: {
          DEFAULT: '#8F3F4F',
          hover: '#74303E',
          soft: '#F3E2E5',
          glow: 'rgba(143, 63, 79, 0.18)',
        },
        // Semantic status colors
        success: {
          DEFAULT: '#2F8760',
          soft: 'rgba(47, 135, 96, 0.10)',
          glow: 'rgba(47, 135, 96, 0.20)',
        },
        warning: {
          DEFAULT: '#B77A25',
          soft: 'rgba(183, 122, 37, 0.10)',
          glow: 'rgba(183, 122, 37, 0.20)',
        },
        danger: {
          DEFAULT: '#B94343',
          soft: 'rgba(185, 67, 67, 0.10)',
          glow: 'rgba(185, 67, 67, 0.20)',
        },
        info: {
          DEFAULT: '#527A9E',
          soft: 'rgba(82, 122, 158, 0.10)',
          glow: 'rgba(82, 122, 158, 0.20)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      fontSize: {
        // Type scale
        page: ['28px', { lineHeight: '36px', fontWeight: '600' }],
        section: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        card: ['14px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        secondary: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        metadata: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        label: ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },
      spacing: {
        // Spacing scale
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '20px',
        'space-6': '24px',
        'space-8': '32px',
        'space-10': '40px',
        'space-12': '48px',
      },
      borderRadius: {
        // Radius scale
        'radius-sm': '6px',
        'radius-md': '8px',
        'radius-lg': '10px',
        'radius-xl': '12px',
        'radius-pill': '9999px',
      },
      boxShadow: {
        // Shadow scale - softer for light theme
        'shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
        'shadow-glow': '0 0 14px rgba(143, 63, 79, 0.12)',
        'shadow-glow-success': '0 0 14px rgba(47, 135, 96, 0.12)',
        'shadow-glow-danger': '0 0 14px rgba(185, 67, 67, 0.12)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
      },
      transitionTimingFunction: {
        'ease': 'ease',
      },
    },
  },
  plugins: [],
}
