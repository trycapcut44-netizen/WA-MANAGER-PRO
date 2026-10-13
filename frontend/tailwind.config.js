/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#0B141A',
          panel: '#111B21',
          header: '#1F2C34',
          subtle: '#182229',
          border: '#222D34',
          input: '#2A3942',
          green: '#25D366',
          teal: '#00A884',
          'bubble-in': '#202C33',
          'bubble-out': '#005C4B',
          'bubble-out-dark': '#025143',
          text: '#E9EDEF',
          muted: '#8696A0',
          dim: '#667781',
          danger: '#EA0038'
        }
      },
      fontFamily: {
        sans: [
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
