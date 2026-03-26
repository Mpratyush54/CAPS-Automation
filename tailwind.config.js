// tailwind.config.js
module.exports = {
  darkMode: 'class', // enable class-based dark mode
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A90E2',
        secondary: '#50E3C2',
        surface: '#1E1E1E',
        background: '#121212',
        error: '#FF6B6B',
        onPrimary: '#FFFFFF',
        onSecondary: '#000000',
        onSurface: '#E0E0E0',
        onBackground: '#E0E0E0',
        onError: '#FFFFFF',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
