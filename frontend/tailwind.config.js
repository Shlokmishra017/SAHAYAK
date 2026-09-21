/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#174c42',
          foreground: '#ffffff',
          dark: '#123e39',
        },
        sidebar: {
          DEFAULT: '#fbfcfb',
          border: '#dfe7e3',
          foreground: '#15221f',
          accent: '#e6f1eb',
          'accent-foreground': '#174d43',
        },
        border: '#dfe8e3',
        background: '#f5f7f6',
        foreground: '#15221f',
      },
      boxShadow: {
        v0: '0 8px 30px rgba(30,72,58,0.035)',
      },
    },
  },
  plugins: [],
}
