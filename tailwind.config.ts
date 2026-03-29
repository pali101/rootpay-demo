import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0B0D',
        'bg-card': 'rgba(255,255,255,0.03)',
        emerald: '#00E5A0',
        coral: '#FF6B35',
        'text-primary': '#E8E6DF',
        'text-muted': '#6B6A65',
        'border-subtle': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      backdropBlur: {
        card: '8px',
      },
      keyframes: {
        pulse_coral: {
          '0%, 100%': { color: '#FF6B35', textShadow: '0 0 12px rgba(255,107,53,0.8)' },
          '50%': { color: '#ffaa88', textShadow: '0 0 24px rgba(255,107,53,1)' },
        },
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse_coral: 'pulse_coral 0.6s ease-in-out 3',
        fadeSlideIn: 'fadeSlideIn 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config
