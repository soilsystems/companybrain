import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        surface: "hsl(var(--surface))",
        "surface-muted": "hsl(var(--surface-muted))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        success: "hsl(var(--success))",
        "success-muted": "hsl(var(--success-muted))",
        warning: "hsl(var(--warning))",
        "warning-muted": "hsl(var(--warning-muted))",
        destructive: "hsl(var(--destructive))",
        "destructive-muted": "hsl(var(--destructive-muted))",
      },
      borderRadius: {
        md: "0.5rem",
        base: "0.75rem",
        panel: "1.125rem",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgb(0 0 0 / 0.06)",
        panel: "0 10px 30px -10px rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
