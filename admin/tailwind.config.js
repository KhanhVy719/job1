/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./sections/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': 'rgb(var(--primary) / <alpha-value>)',
        'bg-body': 'rgb(var(--bg-body) / <alpha-value>)',
        'primary-light': 'rgb(var(--primary-light) / <alpha-value>)',
      },
      keyframes: {
        'spinner-border': {
          to: { transform: 'rotate(1turn)' },
        },
        'spinner-grow': {
          '0%': { transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0' },
        },
        l1: {
          "0%": { "background-size": "20% 100%, 20% 100%, 20% 100%" },
          "33%": { "background-size": "20% 10%, 20% 100%, 20% 100%" },
          "50%": { "background-size": "20% 100%, 20% 10%, 20% 100%" },
          "66%": { "background-size": "20% 100%, 20% 100%, 20% 10%" },
          "to": { "background-size": "20% 100%, 20% 100%, 20% 100%" },
        },
        bodyLoadEffect: {
          '0%': { opacity: '1', zIndex: '1000' },
          '75%': { opacity: '1', zIndex: '1000' },
          '100%': { opacity: '0', zIndex: '-100' },
        },
        logoLoad: {
          '0%': { transform: 'scale(1.05)' },
          '60%': { transform: 'scale(1)', opacity: '1' },
          '80%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        baseLoad: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1', overflow: 'unset', height: 'auto' },
        },

        'qtip-animation': {
          '0%': {
            opacity: '0',
            transform: 'scale(.3)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          },
        }
      },
      animation: {
        l1: 'l1 1s infinite linear',
        bodyLoadEffect: 'bodyLoadEffect 1.5s forwards',
        logoLoad: 'logoLoad 1.5s forwards',
        baseLoad: 'baseLoad 2s forwards',
        qtip: 'qtip-animation 200ms ease-out',
        'spinner-border': 'spinner-border 0.75s linear infinite',
        'spinner-grow': 'spinner-grow 0.75s linear infinite',
      }
    },
  },
  plugins: [],
};
