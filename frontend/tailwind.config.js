/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: 'var(--color-sidebar-bg, #1E3A5F)',
          active: 'var(--color-sidebar-active, #2C5282)',
        },
        primary: {
          DEFAULT: 'var(--color-primary, #1E3A8A)',
          light: 'var(--color-primary-light, #3B5FCC)',
          dark: '#172554',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #F59E0B)',
          light: '#FBBF24',
          dark: '#D97706',
        },
        success: {
          DEFAULT: 'var(--color-success, #16A34A)',
          light: '#22C55E',
          dark: '#15803D',
        },
        danger: {
          DEFAULT: 'var(--color-danger, #DC2626)',
          light: '#EF4444',
          dark: '#B91C1C',
        },
        warning: {
          DEFAULT: 'var(--color-warning, #D97706)',
          light: '#F59E0B',
          dark: '#B45309',
        },
        neutral: {
          50: 'var(--color-neutral-50, #F9FAFB)',
          100: '#F3F4F6',
          200: 'var(--color-neutral-200, #E5E7EB)',
          300: '#D1D5DB',
          400: 'var(--color-neutral-400, #9CA3AF)',
          500: '#6B7280',
          600: '#4B5563',
          700: 'var(--color-neutral-700, #374151)',
          800: '#1F2937',
          900: 'var(--color-neutral-900, #111827)',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        kiosk: ['Inter', 'Archivo Black', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'control': '8px',
        'pill': '999px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.05)',
        'elevated': '0 4px 12px rgba(0,0,0,0.08)',
        'modal': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'kiosk-glow': '0 0 40px rgba(22, 163, 74, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'number-highlight': 'highlight 0.5s ease-out',
      },
      keyframes: {
        highlight: {
          '0%': { transform: 'scale(1.08)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
