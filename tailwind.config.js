/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Slate dipetakan ke CSS variables agar tema dark/light bisa
        // di-switch secara global tanpa mengubah kelas komponen.
        // Nilai default (dark) didefinisikan di src/index.css `:root`.
        slate: {
          50: 'rgb(var(--tw-slate-50) / <alpha-value>)',
          100: 'rgb(var(--tw-slate-100) / <alpha-value>)',
          200: 'rgb(var(--tw-slate-200) / <alpha-value>)',
          300: 'rgb(var(--tw-slate-300) / <alpha-value>)',
          400: 'rgb(var(--tw-slate-400) / <alpha-value>)',
          500: 'rgb(var(--tw-slate-500) / <alpha-value>)',
          600: 'rgb(var(--tw-slate-600) / <alpha-value>)',
          700: 'rgb(var(--tw-slate-700) / <alpha-value>)',
          800: 'rgb(var(--tw-slate-800) / <alpha-value>)',
          900: 'rgb(var(--tw-slate-900) / <alpha-value>)',
          950: 'rgb(var(--tw-slate-950) / <alpha-value>)',
        },
        // Aksen utama CodeLearn: muted green / sage.
        // Nilai dark/light didefinisikan di src/index.css (:root / html.light).
        accent: {
          50: 'rgb(var(--tw-accent-50) / <alpha-value>)',
          100: 'rgb(var(--tw-accent-100) / <alpha-value>)',
          200: 'rgb(var(--tw-accent-200) / <alpha-value>)',
          300: 'rgb(var(--tw-accent-300) / <alpha-value>)',
          400: 'rgb(var(--tw-accent-400) / <alpha-value>)',
          500: 'rgb(var(--tw-accent-500) / <alpha-value>)',
          600: 'rgb(var(--tw-accent-600) / <alpha-value>)',
          700: 'rgb(var(--tw-accent-700) / <alpha-value>)',
          800: 'rgb(var(--tw-accent-800) / <alpha-value>)',
          900: 'rgb(var(--tw-accent-900) / <alpha-value>)',
          950: 'rgb(var(--tw-accent-950) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
