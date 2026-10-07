import * as React from "react";
import { cn } from "@/lib/utils";

export const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex rounded-md shadow-xs",
      orientation === "vertical" ? "flex-col" : "flex-row",
      className
    )}
    {...props}
  />
));
ButtonGroup.displayName = "ButtonGroup";

export const ButtonGroupText = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("inline-flex items-center px-2.5 py-1 text-xs font-medium", className)}
    {...props}
  />
));
ButtonGroupText.displayName = "ButtonGroupText";
