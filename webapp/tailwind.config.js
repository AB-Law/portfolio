/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-void": "#0D1117",
        "void": "#0D1117",
        "glass-panel": "rgba(22, 27, 34, 0.7)",
        "glass-base": "rgba(22, 27, 34, 0.7)",
        "border-subtle": "rgba(240, 246, 252, 0.1)",
        "glass-border": "rgba(240, 246, 252, 0.1)",
        "text-primary": "#F0F6FC",
        "text-muted": "#8B949E",
        "accent-cyan": "#79C0FF",
        "accent-magenta": "#FF79C6",
        "accent-lime": "#7EE787",
        "primary": "#429ff0",
        "code-bg": "#010409",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "mono": ["JetBrains Mono", "monospace"],
        "body": ["Inter", "sans-serif"],
        "serif": ["Merriweather", "serif"],
      },
      transitionTimingFunction: {
        "elastic": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "linear-gradient(to right, rgba(240, 246, 252, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(240, 246, 252, 0.05) 1px, transparent 1px)",
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(121, 192, 255, 0.15)',
        'glow-cyan': '0 0 20px -5px rgba(121, 192, 255, 0.15)',
      }
    },
  },
  plugins: [
    typography,
    forms,
    containerQueries
  ],
}
