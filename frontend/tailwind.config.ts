import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#05080D",
          900: "#080D14",
          800: "#0F172A",
          700: "#1E293B",
        },
        sentinela: {
          cyan: "#06B6D4",
          teal: "#14B8A6",
          alert: "#EF4444",
          warning: "#F59E0B",
          success: "#10B981"
        }
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "glass-card": "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(8, 13, 20, 0.85) 100%)",
      }
    },
  },
  plugins: [],
};
export default config;
