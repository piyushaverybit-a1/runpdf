import * as React from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

export const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="relative group inline-flex">{children}</div>
);

export const TooltipTrigger = ({
  children,
  asChild,
  ...props
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) => {
  return <div {...props}>{children}</div>;
};

export const TooltipContent = ({
  children,
  className,
  side = "top",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" | "left" | "right" }) => {
  const sidePositions = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className={cn(
        "absolute z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap",
        sidePositions[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
