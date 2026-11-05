/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EC',     // fondo cálido
        card: '#FFFDF9',      // superficies
        ink: { DEFAULT: '#1A1714', 2: '#4A453F', 3: '#7C756C' },
        line: '#E2DBD0',
        rojo: { DEFAULT: '#B4322A', dark: '#8E241E', soft: '#F6E3DF' },
        verde: { DEFAULT: '#2F6B4F', soft: '#E1EEE6' },
        ambar: { DEFAULT: '#9A6A12', soft: '#F5EAD3' },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '6px' },
    },
  },
  plugins: [],
};
