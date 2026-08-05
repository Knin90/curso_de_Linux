/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#21262d',
          green: '#3fb950',
          cyan: '#58c4dd',
          yellow: '#f0e68c',
          red: '#f85149',
          text: '#e6edf3',
          muted: '#8b949e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'cursor-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(63,185,80,0.15)',
        'glow-cyan': '0 0 20px rgba(88,196,221,0.15)',
        'glow-sm': '0 0 10px rgba(63,185,80,0.1)',
      },
    },
  },
  plugins: [],
}
