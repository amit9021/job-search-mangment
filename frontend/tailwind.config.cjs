const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        brand: {
          DEFAULT: '#2563eb',
          muted: '#dbeafe'
        },
        heat: {
          0: '#94a3b8',
          1: '#f97316',
          2: '#ef4444',
          3: '#b91c1c'
        }
      }
    }
  },
  plugins: []
};
