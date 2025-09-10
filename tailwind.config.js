/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Updated with #466478 as primary
        primary: {
          50: "#f0f2f4",
          100: "#e8edef",
          200: "#c5d0d8",
          300: "#a2b3c1",
          400: "#7b909f",
          500: "#466478", // Main brand color
          600: "#3a5563", // Darker for hover states
          700: "#2d4754",
          800: "#233a45",
          900: "#1a2c36",
        },
        secondary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155", // Dark gray for text
          800: "#1e293b",
          900: "#0f172a",
        },
        // Status Colors - Optimized for accessibility and UX
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#059669", // Updated success green
          600: "#047857",
          700: "#065f46",
          800: "#064e3b",
          900: "#064e3b",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#d97706", // Updated warning orange
          600: "#b45309",
          700: "#92400e",
          800: "#78350f",
          900: "#78350f",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#dc2626", // Consistent danger red
          600: "#b91c1c",
          700: "#991b1b",
          800: "#7f1d1d",
          900: "#7f1d1d",
        },
        // Specialized Colors for Automotive Theme - Harmonized palette
        automotive: {
          "engine-blue": "#466478",
          "brake-red": "#dc2626",
          "suspension-green": "#059669",
          "tools-purple": "#7c3aed",
          "oil-amber": "#d97706",
        },
      },
      // Custom spacing and sizing
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      // Custom animations
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "bounce-subtle": "bounceSubtle 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
      },
    },
  },
  plugins: [],
};
