import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        surface: "#020617",
        "surface-raised": "#0F172A",
        "surface-sunken": "#1E293B",
        // Borders
        border: "#1E293B",
        "border-strong": "#334155",
        // Text
        foreground: "#F8FAFC",
        "foreground-muted": "#94A3B8",
        "foreground-subtle": "#475569",
        // Brand / accent
        brand: "#6366F1",
        "brand-hover": "#818CF8",
        "brand-light": "#1E1B4B",
        "brand-muted": "#7C3AED",
        // Status
        success: "#16A34A",
        "success-bg": "#052E16",
        "success-border": "#166534",
        warning: "#F59E0B",
        "warning-bg": "#451A03",
        "warning-border": "#92400E",
        danger: "#EF4444",
        "danger-bg": "#450A0A",
        "danger-border": "#991B1B",
        // Sidebar (non consommé actuellement, conservé pour compat)
        sidebar: "#1E293B",
        "sidebar-hover": "#334155",
        "sidebar-active": "#6366F1",
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
