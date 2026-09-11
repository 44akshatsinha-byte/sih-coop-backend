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
      }
    }
  },
  plugins: []
};
