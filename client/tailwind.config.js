/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FBF3EC',
          100: '#F4E2D3',
          200: '#E8C9AE',
          300: '#D3A07A',
          400: '#B97B52',
          500: '#A5603A',
          600: '#8B4A2B',
          700: '#74402A',
          800: '#5C3626',
          900: '#4A3026',
          950: '#2E1D16',
        },
        cream: {
          50: '#FFFBF7',
          100: '#FBF3EC',
          200: '#F6E8DC',
          300: '#EBD5C3',
          400: '#DDBFA6',
        },
        gold: { 400: '#DCA675', 500: '#C98B5C', 600: '#A86A40' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(74,48,38,0.05), 0 6px 20px rgba(139,74,43,0.08)',
        lift: '0 2px 4px rgba(74,48,38,0.06), 0 14px 34px rgba(139,74,43,0.14)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(220,166,117,0.7)' }, '70%': { boxShadow: '0 0 0 14px rgba(220,166,117,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(220,166,117,0)' } },
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
