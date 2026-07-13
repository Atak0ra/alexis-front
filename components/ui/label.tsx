import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return <label ref={ref} className={cn("mb-1 block text-sm font-medium text-ink-muted", className)} {...props} />;
  }
);
Label.displayName = "Label";
