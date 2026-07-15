import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover shadow-sm",
  secondary:
    "border border-border bg-surface-raised text-foreground hover:bg-surface-sunken shadow-sm",
  ghost:
    "bg-transparent text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
  danger:
    "bg-danger text-white hover:bg-red-700 shadow-sm",
};

export function buttonVariants(variant: ButtonVariant = "primary"): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant]
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return <button ref={ref} className={cn(buttonVariants(variant), className)} {...props} />;
  }
);
Button.displayName = "Button";
