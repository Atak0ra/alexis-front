import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-ink/30 bg-transparent text-ink hover:bg-paper-dim",
};

export function buttonVariants(variant: ButtonVariant = "primary"): string {
  return cn(
    "inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50",
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
