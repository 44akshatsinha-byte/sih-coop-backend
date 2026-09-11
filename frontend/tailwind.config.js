/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F3EFE6",
        teal: {
          ink: "#3A5F5F"
        },
        forest: "#2C5F4A",
        slate: {
          muted: "#5B6570"
        }
      },
      borderRadius: {
        card: "12px",
        panel: "14px"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(44,95,74,0.3)" },
          "50%": { boxShadow: "0 0 0 8px rgba(44,95,74,0)" }
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
          "80%": { transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out both",
        "fade-in-slow": "fade-in 0.9s ease-out both",
        "slide-up": "slide-up 0.5s ease-out both",
        "slide-up-slow": "slide-up 0.8s ease-out both",
        "slide-down": "slide-down 0.4s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float 5s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
        "spin-slow": "spin-slow 8s linear infinite",
        "wiggle": "wiggle 0.5s ease-in-out"
      }
    }
  },
  plugins: []
};
