/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'among-red': '#C51111',
        'among-blue': '#132ED1',
        'among-green': '#117F2D',
        'among-dark': '#1D1D1D',
      },
    },
  },
  plugins: [],
}

