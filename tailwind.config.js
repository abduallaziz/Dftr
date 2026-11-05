/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0f2137", 800: "#173250", 700: "#24476e", 600: "#3a5f87" },
        brand: { 50: "#eaf6f7", 100: "#cfeaed", 500: "#0e8a96", 600: "#0b7480", 700: "#095e68" },
        ink: "#0f2137",
      },
      fontFamily: {
        sans: ["Noto Sans", "Noto Sans Arabic", "Noto Sans Bengali", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
