import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'open-sans': ['"Open Sans"', ...defaultTheme.fontFamily.sans],
      }
    },
  },
  plugins: [],
} satisfies Config
