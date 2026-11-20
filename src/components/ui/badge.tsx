import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-elevated text-foreground border border-border-subtle",
        violet: "bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30",
        blue: "bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30",
        cyan: "bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30",
        success: "bg-success/15 text-success border border-success/30",
        warning: "bg-warning/15 text-warning border border-warning/30",
        danger: "bg-danger/15 text-danger border border-danger/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
