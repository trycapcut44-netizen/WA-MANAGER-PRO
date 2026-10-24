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
          dark: '#FFFFFF',             // White clean background
          panel: '#FFFFFF',            // White sidebar panel
          header: '#F0F2F5',           // WhatsApp Web light gray header
          subtle: '#F5F6F6',           // Light hover gray
          border: '#E9EDEF',           // Subtle border gray
          input: '#F0F2F5',            // Input background
          green: '#25D366',            // WhatsApp brand green
          teal: '#00A884',             // WhatsApp brand teal
          'bubble-in': '#FFFFFF',      // Incoming message bubble (pure white)
          'bubble-out': '#D9FDD3',     // Outgoing message bubble (official light green)
          'bubble-out-dark': '#C6F7BE',
          text: '#111B21',             // Crisp dark charcoal text
          muted: '#667781',            // Secondary gray text
          dim: '#8696A0',              // Tertiary gray
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
