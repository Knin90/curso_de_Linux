/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#030F0F',
          text: '#DCECE4',
        },
      },
    },
  },
  plugins: [],
}
