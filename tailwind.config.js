/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        lumina: {
          base: 'rgb(var(--base) / <alpha-value>)',
          surface: 'rgb(var(--surface) / <alpha-value>)',
          highlight: 'rgb(var(--highlight) / <alpha-value>)',
          accent: 'rgb(var(--accent) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          danger: 'rgb(var(--danger) / <alpha-value>)',
          text: 'rgb(var(--text-main) / <alpha-value>)',
        },
        'real-white': '#ffffff',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      textShadow: {
        'glow': '0 0 20px rgba(var(--accent), 0.3)',
      }
    },
  },
  plugins: [],
}
