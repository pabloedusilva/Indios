/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Tema — controlado por variáveis CSS (light/dark)
          bg:          'rgb(var(--brand-bg) / <alpha-value>)',
          surface:     'rgb(var(--brand-surface) / <alpha-value>)',
          'surface-2': 'rgb(var(--brand-surface-2) / <alpha-value>)',
          border:      'rgb(var(--brand-border) / <alpha-value>)',
          'border-2':  'rgb(var(--brand-border-2) / <alpha-value>)',

          // Texto
          text:        'rgb(var(--brand-text) / <alpha-value>)',
          'text-2':    'rgb(var(--brand-text-2) / <alpha-value>)',
          'text-3':    'rgb(var(--brand-text-3) / <alpha-value>)',

          // Marca — constantes (não mudam entre temas)
          red:         '#C93517',
          'red-dark':  '#A62810',
          'red-light': '#E84225',
          orange:      '#E8650A',
          'orange-dark':'#C55208',
          'orange-light':'#FF7D2A',
          gold:        '#C9860A',
        },
      },
      fontFamily: {
        heading: ['"Outfit"', '"DM Sans"', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand':     '0 4px 20px 0 rgba(201,53,23,0.12)',
        'brand-lg':  '0 8px 36px 0 rgba(201,53,23,0.16)',
        'card':      '0 1px 4px 0 rgba(28,20,16,0.06), 0 4px 16px 0 rgba(28,20,16,0.06)',
        'card-hover':'0 4px 24px 0 rgba(28,20,16,0.10)',
        'sidebar':   '2px 0 16px 0 rgba(28,20,16,0.06)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #C93517 0%, #E8650A 100%)',
        'gradient-warm':  'linear-gradient(135deg, #F7F5F2 0%, #FDF9F6 100%)',
        'gradient-card':  'linear-gradient(145deg, #FFFFFF 0%, #FDF9F6 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
