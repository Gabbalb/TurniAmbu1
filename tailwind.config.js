/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shift: {
          morning: {
            start: '#3b82f6', // Blue 500
            end: '#06b6d4',   // Cyan 500
            text: '#1e3a8a',   // Dark Blue
          },
          afternoon: {
            start: '#f97316', // Orange 500
            end: '#eab308',   // Yellow 500
            text: '#7c2d12',   // Dark Orange
          },
          night: {
            start: '#8b5cf6', // Violet 500
            end: '#ec4899',   // Pink 500
            text: '#4c1d95',   // Dark Purple
          },
          occupied: {
            bg: '#f3f4f6',    // Gray 100
            border: '#e5e7eb',// Gray 200
            text: '#9ca3af',  // Gray 400
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 1px 5px 0 rgba(0, 0, 0, 0.07)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        }
      }
    },
  },
  plugins: [],
}
