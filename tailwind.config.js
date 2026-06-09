/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#141E30', // Deep slate for luxury feel
          900: '#0F172A',
          950: '#020617',
        },
        gold: {
          400: '#FDE047',
          500: '#D4AF37', // Classic metallic gold
          600: '#B8860B', // Dark goldenrod
        }
      },
    },
  },
  plugins: [],
}
