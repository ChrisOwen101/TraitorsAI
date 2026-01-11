/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        traitor: "#e94560",
        "traitor-light": "#ff6b85",
        faithful: "#4da6ff",
        "faithful-light": "#6bb8ff",
      },
    },
  },
  plugins: [],
};
