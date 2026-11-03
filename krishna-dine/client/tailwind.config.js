/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF7F2',
          100: '#D7EDE1',
          200: '#AFD9C3',
          300: '#7FBF9E',
          400: '#4F9F78',
          500: '#2F835C',
          600: '#1F6B4A',
          700: '#17563C',
          800: '#114531',
          900: '#0B3B2E',
          950: '#06251C',
        },
        cream: {
          50: '#FFFDF8',
          100: '#FBF7EE',
          200: '#F6EFDF',
          300: '#EDE1C6',
          400: '#E0CC9F',
        },
        gold: { 400: '#D6B36A', 500: '#C29A48', 600: '#A27C30' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(11,59,46,0.04), 0 4px 16px rgba(11,59,46,0.06)',
        lift: '0 2px 4px rgba(11,59,46,0.06), 0 12px 32px rgba(11,59,46,0.10)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(214,179,106,0.7)' }, '70%': { boxShadow: '0 0 0 14px rgba(214,179,106,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(214,179,106,0)' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { '0%': { transform: 'scale(0.96)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'slide-up': 'slide-up 0.28s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in 0.2s ease-out',
        pop: 'pop 0.22s ease-out',
      },
    },
  },
  plugins: [],
};
