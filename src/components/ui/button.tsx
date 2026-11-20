import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white shadow-md shadow-[#7C3AED]/20 hover:brightness-110",
        secondary:
          "bg-elevated text-foreground border border-border-subtle hover:border-border-strong hover:bg-card",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-elevated/60",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-elevated/60",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger hover:text-white",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
