/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          blue: '#E0E7FF',
          darkBlue: '#1E3A8A',
          lavender: '#F5F3FF',
        }
      }
    },
  },
  plugins: [],
}

