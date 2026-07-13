import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        "paper-dim": "#F1F0EC",
        ink: "#16171B",
        "ink-muted": "#5B5B63",
        rule: "#E3E1DA",
        signal: "#2F5CF6",
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
