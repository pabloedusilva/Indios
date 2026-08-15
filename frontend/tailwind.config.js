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
        'fade-out': 'fadeOut 0.7s ease-in forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'loader-fade-out': 'loaderFadeOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'content-fade-out': 'contentFadeOut 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'pulse-ring-blue': 'pulseRingBlue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring-orange': 'pulseRingOrange 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring-green': 'pulseRingGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring-red': 'pulseRingRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounceSlow 2s ease-in-out infinite',
        'scale-check': 'scaleCheck 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'float-subtle': 'floatSubtle 2.5s ease-in-out infinite',
        'progress-fill': 'progressFill 2s ease-in-out infinite',
        'progress-flash': 'progressFlash 1.8s ease-in-out infinite',
        'indeterminate': 'indeterminate 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        loaderFadeOut: {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' },
        },
        contentFadeOut: {
          '0%':   { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
        },
        pulseRingBlue: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0px rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 0 12px rgba(59, 130, 246, 0), 0 0 30px rgba(59, 130, 246, 0)',
          },
        },
        pulseRingOrange: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0px rgba(249, 115, 22, 0.7), 0 0 20px rgba(249, 115, 22, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 0 12px rgba(249, 115, 22, 0), 0 0 30px rgba(249, 115, 22, 0)',
          },
        },
        pulseRingGreen: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0px rgba(16, 185, 129, 0.7), 0 0 20px rgba(16, 185, 129, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 0 12px rgba(16, 185, 129, 0), 0 0 30px rgba(16, 185, 129, 0)',
          },
        },
        pulseRingRed: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0px rgba(239, 68, 68, 0.7), 0 0 20px rgba(239, 68, 68, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 0 12px rgba(239, 68, 68, 0), 0 0 30px rgba(239, 68, 68, 0)',
          },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleCheck: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(200%)', opacity: '0' },
        },
        floatSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        progressFill: {
          '0%': { 
            width: '0%',
          },
          '50%': { 
            width: '70%',
          },
          '100%': { 
            width: '0%',
          },
        },
        progressFlash: {
          '0%': { 
            transform: 'translateX(-100%)',
          },
          '100%': { 
            transform: 'translateX(400%)',
          },
        },
        indeterminate: {
          '0%':   { transform: 'translateX(-100%) scaleX(0.4)' },
          '40%':  { transform: 'translateX(0%)    scaleX(0.6)' },
          '70%':  { transform: 'translateX(60%)   scaleX(0.4)' },
          '100%': { transform: 'translateX(100%)  scaleX(0.2)' },
        },
      },
    },
  },
  plugins: [],
}
