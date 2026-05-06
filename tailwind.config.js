/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        player: '#22d3ee',
        enemy: '#f472b6',
        danger: '#fbbf24',
        navy: '#0a0e1a',
      },
    },
  },
  plugins: [],
}
