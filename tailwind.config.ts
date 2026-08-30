import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-syne)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "black-void": "var(--black-void)",
        "black-deep": "var(--black-deep)",
        "black-surface": "var(--black-surface)",
        "black-card": "var(--black-card)",
        "black-elevated": "var(--black-elevated)",
        "black-hover": "var(--black-hover)",
        "border-dim": "var(--border-dim)",
        "border-mid": "var(--border-mid)",
        "border-bright": "var(--border-bright)",
        "silver-faint": "var(--silver-faint)",
        "silver-muted": "var(--silver-muted)",
        "silver-mid": "var(--silver-mid)",
        "silver-base": "var(--silver-base)",
        "silver-light": "var(--silver-light)",
        "silver-bright": "var(--silver-bright)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        info: "var(--info)",
        cyber: "var(--accent-cyber)",
      },
    },
  },
  plugins: [],
} satisfies Config;
