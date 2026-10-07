import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <Loader2 className={cn("size-4 animate-spin text-muted-foreground", className)} {...props} />
);

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
  <div className="relative inline-block text-left">{children}</div>
);
export const DropdownMenuTrigger = ({ children, render, ...props }: any) => {
  return render ? React.cloneElement(render, props, children) : <div {...props}>{children}</div>;
};
export const DropdownMenuContent = ({ className, children, ...props }: any) => (
  <div className={cn("absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props}>
    {children}
  </div>
);
export const DropdownMenuItem = ({ className, children, onSelect, ...props }: any) => (
  <div
    onClick={onSelect}
    className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground", className)}
    {...props}
  >
    {children}
  </div>
);

export const HoverCard = ({ children }: any) => <div className="relative inline-block">{children}</div>;
export const HoverCardTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const HoverCardContent = ({ className, children, ...props }: any) => (
  <div className={cn("absolute z-50 rounded-md border border-border bg-popover p-3 shadow-md", className)} {...props}>
    {children}
  </div>
);

export const Select = ({ children }: any) => <div className="relative">{children}</div>;
export const SelectTrigger = ({ className, children, ...props }: any) => (
  <button className={cn("flex items-center justify-between rounded-md px-3 py-2 text-sm", className)} {...props}>{children}</button>
);
export const SelectContent = ({ className, children, ...props }: any) => (
  <div className={cn("absolute z-50 rounded-md border border-border bg-popover shadow-md", className)} {...props}>{children}</div>
);
export const SelectItem = ({ className, children, ...props }: any) => (
  <div className={cn("px-2 py-1.5 text-sm cursor-pointer hover:bg-accent", className)} {...props}>{children}</div>
);
export const SelectValue = ({ children, placeholder, ...props }: any) => (
  <span {...props}>{children || placeholder}</span>
);

export const Command = ({ className, children, ...props }: any) => (
  <div className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)} {...props}>{children}</div>
);
export const CommandInput = ({ className, ...props }: any) => (
  <input className={cn("flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-sm outline-hidden placeholder:text-muted-foreground", className)} {...props} />
);
export const CommandList = ({ className, children, ...props }: any) => (
  <div className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} {...props}>{children}</div>
);
export const CommandEmpty = ({ className, children, ...props }: any) => (
  <div className={cn("py-6 text-center text-sm", className)} {...props}>{children}</div>
);
export const CommandGroup = ({ className, children, ...props }: any) => (
  <div className={cn("overflow-hidden p-1 text-foreground", className)} {...props}>{children}</div>
);
export const CommandItem = ({ className, children, ...props }: any) => (
  <div className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground", className)} {...props}>{children}</div>
);
export const CommandSeparator = ({ className, ...props }: any) => (
  <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
);
