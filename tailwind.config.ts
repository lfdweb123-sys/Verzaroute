import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        gold: {
          DEFAULT: "#D4AF37",
          dark: "#C9A227",
          light: "#F0D878",
        },
        obsidian: {
          DEFAULT: "#0a0a0a",
          light: "#121212",
          card: "#171717",
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #F0D878 0%, #D4AF37 45%, #9E7B15 100%)",
      },
      boxShadow: {
        gold: "0 0 25px rgba(212, 175, 55, 0.25)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
