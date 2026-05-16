import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Coinbase Blue — single brand accent
        brand: {
          50:  "#eff4ff",
          100: "#dce5ff",
          200: "#b9ccff",
          400: "#4d7cff",
          500: "#0052ff",
          600: "#003ecc",
          700: "#002ba6",
          900: "#001166",
        },
        // Coinbase surface & text tokens
        ink:      "#0a0b0d",
        body:     "#5b616e",
        muted:    "#7c828a",
        hairline: "#dee1e6",
        canvas:   "#ffffff",
        "surface-soft":          "#f7f7f7",
        "surface-strong":        "#eef0f3",
        "surface-dark":          "#0a0b0d",
        "surface-dark-elevated": "#16181c",
        "on-dark":               "#ffffff",
        "on-dark-soft":          "#a8acb3",
        "semantic-up":   "#05b169",
        "semantic-down": "#cf202f",
      },
      borderRadius: {
        pill: "100px",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
