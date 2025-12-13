import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          hover: '#0F766E',
          light: '#14B8A6',
        },
        secondary: {
          DEFAULT: '#0067b8',
          hover: '#005293',
          light: '#0078d4',
        },
        accent: {
          yellow: '#fcd12c',
          green: '#25d366',
          red: '#DD4B39',
          orange: '#ffac44',
          sky: '#55acee',
          purple: '#ac2bac',
        },
        gray: {
          50: '#F9F9F9',
          100: '#F5F5F5',
          200: '#f2f2f2',
          300: '#E3EDF7',
          400: '#e6e6e6',
          500: '#ccc',
          600: '#666',
          700: '#5e5e5e',
          800: '#464646',
          900: '#2f2f2f',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'Montserrat', 'Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': ['11px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['15px', '20px'],
        'lg': ['18px', '24px'],
        'xl': ['20px', '24px'],
        '2xl': ['24px', '28px'],
        '3xl': ['37px', '44px'],
        '4xl': ['46px', '56px'],
        '5xl': ['62px', '72px'],
      },
      maxWidth: {
        'container': '1600px',
        'container-wide': '1920px',
      },
      spacing: {
        'section-sm': '40px',
        'section-md': '60px',
        'section-lg': '90px',
        'section-xl': '120px',
      },
      borderRadius: {
        'sm': '5px',
        'DEFAULT': '5px',
        'md': '5px',
        'lg': '5px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -50px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '75%': { transform: 'translate(50px, 50px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
