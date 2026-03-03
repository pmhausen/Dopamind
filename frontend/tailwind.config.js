/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Calm, focus-optimized palette
        surface: {
          light: "#FAFAF9",
          dark: "#1A1A2E",
        },
        card: {
          light: "#FFFFFF",
          dark: "#16213E",
        },
        accent: {
          DEFAULT: "#6C63FF",
          soft: "#8B83FF",
          glow: "#A29BFE",
        },
        success: {
          DEFAULT: "#00C9A7",
          soft: "#00E4BF",
        },
        warn: "#FFB84C",
        danger: "#FF6B6B",
        muted: {
          light: "#9CA3AF",
          dark: "#6B7280",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "xp-fill": "xpFill 1s ease-out",
        "reward-pop": "rewardPop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        xpFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--xp-width)" },
        },
        rewardPop: {
          "0%": { transform: "scale(0)" },
          "100%": { transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
