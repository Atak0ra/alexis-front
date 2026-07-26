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
        "foreground-subtle": "#A1A1AA",
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
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)",
        modal: "0 20px 60px -10px rgb(0 0 0 / 0.20)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.375rem",
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
