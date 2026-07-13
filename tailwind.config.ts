import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F2E9",
        "paper-dim": "#EEE4D2",
        ink: "#201C18",
        "ink-muted": "#6B6055",
        rule: "#E2D6C3",
        signal: "#B0653A",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-display)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
