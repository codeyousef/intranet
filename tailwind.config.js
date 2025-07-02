/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        flyadeal: {
          purple: '#522D6D',
          yellow: '#A8A900', // Darker yellow for better contrast
          'dark-yellow': '#D7D800', // Original yellow kept for reference
          'dark-blue': '#1877B8',
          'light-blue': '#2CB3E2',
          pink: '#B33288',
          'red-pink': '#E74D66',
          red: '#E74735',
          orange: '#F39E5C',
          green: '#177D44',
          'bright-green': '#0D9F3E', // Brighter green for better contrast
        },
      },
      fontFamily: {
        raleway: ['Raleway', 'sans-serif'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
      },
      backdropBlur: {
        'glass': '10px',
      },
    },
  },
  plugins: [],
}
