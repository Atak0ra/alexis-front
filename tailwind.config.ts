import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        surface: "#FAFAF9",
        "surface-raised": "#FFFFFF",
        "surface-sunken": "#F4F4F5",
        // Borders
        border: "#E4E4E7",
        "border-strong": "#D4D4D8",
        // Text
        foreground: "#18181B",
        "foreground-muted": "#71717A",
        "foreground-subtle": "#6B7280",
        // Brand / accent
        brand: "#4F46E5",
        "brand-hover": "#4338CA",
        "brand-light": "#EEF2FF",
        "brand-muted": "#818CF8",
        // Status
        success: "#16A34A",
        "success-bg": "#F0FDF4",
        "success-border": "#BBF7D0",
        warning: "#D97706",
        "warning-bg": "#FFFBEB",
        "warning-border": "#FDE68A",
        danger: "#DC2626",
        "danger-bg": "#FEF2F2",
        "danger-border": "#FECACA",
        // Sidebar (non consommé actuellement, conservé pour compat)
        sidebar: "#1E293B",
        "sidebar-hover": "#334155",
        "sidebar-active": "#4F46E5",
        "sidebar-text": "#CBD5E1",
        "sidebar-text-active": "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
        modal: "0 20px 60px -10px rgb(0 0 0 / 0.20)",
      },
      fontSize: {
        xs:   ["0.6875rem", { lineHeight: "1rem" }],
        sm:   ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg:   ["1rem",      { lineHeight: "1.625rem" }],
        xl:   ["1.125rem",  { lineHeight: "1.75rem" }],
        "2xl": ["1.3125rem", { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.625rem",  { lineHeight: "2rem",     letterSpacing: "-0.02em" }],
        "4xl": ["2rem",      { lineHeight: "2.25rem",  letterSpacing: "-0.02em" }],
        "5xl": ["2.5rem",    { lineHeight: "2.75rem",  letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.25rem",
        lg: "0.5rem",
        xl: "0.625rem",
        "2xl": "0.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
