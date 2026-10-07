import * as React from "react";
import { cn } from "@/lib/utils";

export const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex flex-col w-full rounded-2xl bg-secondary/80 border border-border/70 focus-within:border-foreground/30 focus-within:ring-1 focus-within:ring-foreground/20", className)}
    {...props}
  />
));
InputGroup.displayName = "InputGroup";

export const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: string }
>(({ className, align: _align, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-1 px-3 py-2", className)}
    {...props}
  />
));
InputGroupAddon.displayName = "InputGroupAddon";

export const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    size?: "default" | "sm" | "icon" | "icon-sm";
  }
>(({ className, variant = "ghost", size = "icon-sm", ...props }, ref) => {
  const sizeStyles = {
    default: "h-9 px-3",
    sm: "h-8 px-2 text-xs",
    icon: "h-8 w-8 p-1.5",
    "icon-sm": "h-7 w-7 p-1",
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer",
        sizeStyles[size],
        variant === "default" && "bg-foreground text-background hover:opacity-90 hover:text-background",
        variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className
      )}
      {...props}
    />
  );
});
InputGroupButton.displayName = "InputGroupButton";

export const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-hidden focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
InputGroupTextarea.displayName = "InputGroupTextarea";
