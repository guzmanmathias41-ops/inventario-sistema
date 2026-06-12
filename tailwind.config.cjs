/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0ff',
          100: '#b3d1ff',
          200: '#80b3ff',
          300: '#4d94ff',
          400: '#1a75ff',
          DEFAULT: '#0066FF',
          500: '#0066FF',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        dark: {
          DEFAULT: '#131f38',
          50: '#e8ebf0',
          100: '#c5ccd9',
          200: '#9faabf',
          300: '#7988a4',
          400: '#5c6f90',
          500: '#3f5172',
          600: '#2d3c5a',
          700: '#1e2b47',
          800: '#131f38',
          900: '#0a1220',
        },
        accent: {
          orange: '#ff8c00',
          green: '#00c853',
          red: '#ff3d00',
          yellow: '#ffd600',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      sidebar: {
        width: '260px',
        collapsed: '72px',
      },
    },
  },
  plugins: [],
}