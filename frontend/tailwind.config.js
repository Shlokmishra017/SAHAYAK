/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060B14',
          900: '#0B1220', // Primary app background
          850: '#0E1729',
          800: '#111A2B', // Surface cards
          750: '#142034',
          700: '#162238', // Elevated surface
          600: '#1D2D49',
          500: '#2A3F63',
          border: '#1E2D4A', // Subtle border
        },
        gov: {
          saffron: '#F59E0B',
          saffronDark: '#D97706',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          blue: '#2563EB',
          navy: '#0B1220',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#0284C7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'modal': '0 12px 32px rgba(0, 0, 0, 0.14)',
        'dropdown': '0 8px 20px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'card': '12px',
        'modal': '14px',
      }
    },
  },
  plugins: [],
}
