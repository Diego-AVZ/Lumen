/** @param {string} variable */
function tone(variable) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `var(${variable})`
      : `color-mix(in srgb, var(${variable}) ${Number(opacityValue) * 100}%, transparent)`;
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        linen: '#f3eee6',
        mist: '#e7e0d4',
        inkwell: '#1b1612',
        brass: '#8a6232',
        ink: tone('--ink'),
        paper: tone('--paper'),
        gold: tone('--gold'),
        dust: tone('--dust'),
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        phone: '0 30px 70px rgba(48, 32, 16, 0.22), 0 2px 0 rgba(255,255,255,0.55) inset',
      },
    },
  },
  plugins: [],
};
