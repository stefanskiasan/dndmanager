import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: '#f4e4c1',
        ink: '#2c1810',
        gold: '#c9a84c',
        crimson: '#8b1a1a',
        forest: '#2d5a27',
        steel: '#71797E',
      },
    },
  },
  plugins: [],
}

export default config
