import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 active:scale-95",
          {
            "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-sm":
              variant === "default",
            "bg-black/5 dark:bg-white/10 text-foreground hover:bg-black/10 dark:hover:bg-white/20":
              variant === "secondary",
            "border border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5":
              variant === "outline",
            "hover:bg-black/5 dark:hover:bg-white/5": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-[8px] px-3 text-xs": size === "sm",
            "h-12 rounded-[14px] px-8 text-base": size === "lg",
            "h-10 w-10 p-2": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
