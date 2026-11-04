import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#effcf4", 100: "#d9f8e4", 500: "#16a34a", 600: "#15803d", 700: "#166534", 900: "#14532d" }
      },
      boxShadow: { soft: "0 12px 40px rgba(15, 23, 42, .07)" }
    }
  },
  plugins: []
};
export default config;
