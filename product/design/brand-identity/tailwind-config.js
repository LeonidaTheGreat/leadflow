/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LeadFlow AI Custom Palette
        slate: {
          50: '#f1f5f9',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#78716c',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        emerald: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c1d',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Semantic colors (mapped to above)
        success: 'rgb(16 185 129)', // emerald-500
        warning: 'rgb(245 158 11)', // amber-500
        danger: 'rgb(239 68 68)',   // red-500
        info: 'rgb(59 130 246)',    // blue-500
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['14px', { lineHeight: '1.5' }],
        lg: ['16px', { lineHeight: '1.5' }],
        xl: ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.3' }],
        '3xl': ['24px', { lineHeight: '1.3' }],
        '4xl': ['32px', { lineHeight: '1.2' }],
        '5xl': ['48px', { lineHeight: '1.2' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        0: '0px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
      },
      borderRadius: {
        none: '0',
        sm: '4px',
        base: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
      transitionDuration: {
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
      },
      // Custom utilities
      backgroundImage: {
        'gradient-emerald': 'linear-gradient(135deg, rgb(16 185 129) 0%, rgb(5 150 105) 100%)',
        'gradient-slate': 'linear-gradient(135deg, rgb(15 23 42) 0%, rgb(30 41 59) 100%)',
      },
    },
  },
  plugins: [
    // Custom plugins for LeadFlow components
    function ({ addComponents, theme }) {
      addComponents({
        // Button components
        '.btn-primary': {
          '@apply px-3 py-2 rounded-md text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors duration-200 cursor-pointer':
            {},
        },
        '.btn-secondary': {
          '@apply px-3 py-2 rounded-md text-sm font-semibold text-slate-900 bg-slate-200 hover:bg-slate-300 transition-colors duration-200 cursor-pointer dark:bg-slate-700 dark:text-slate-100':
            {},
        },
        '.btn-ghost': {
          '@apply px-3 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800':
            {},
        },
        '.btn-danger': {
          '@apply px-3 py-2 rounded-md text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 cursor-pointer':
            {},
        },
        '.btn-icon': {
          '@apply inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer':
            {},
        },

        // Input components
        '.input-base': {
          '@apply px-3 py-2 rounded-md text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100':
            {},
        },
        '.input-error': {
          '@apply border-red-500 focus:ring-red-500':
            {},
        },

        // Card components
        '.card': {
          '@apply rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900':
            {},
        },
        '.card-elevated': {
          '@apply rounded-lg border border-slate-200 bg-white p-4 shadow-md hover:shadow-lg transition-shadow duration-200 dark:border-slate-800 dark:bg-slate-900':
            {},
        },

        // Badge components
        '.badge-success': {
          '@apply inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200':
            {},
        },
        '.badge-warning': {
          '@apply inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200':
            {},
        },
        '.badge-danger': {
          '@apply inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200':
            {},
        },
        '.badge-info': {
          '@apply inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200':
            {},
        },

        // Layout utilities
        '.section-spacing': {
          '@apply py-12 px-4 md:py-16 md:px-6 lg:py-20 lg:px-8':
            {},
        },
        '.container-max': {
          '@apply mx-auto max-w-7xl':
            {},
        },

        // Text utilities
        '.text-muted': {
          '@apply text-slate-500 dark:text-slate-400':
            {},
        },
        '.text-subtle': {
          '@apply text-slate-600 dark:text-slate-300':
            {},
        },
      });
    },
  ],
};
