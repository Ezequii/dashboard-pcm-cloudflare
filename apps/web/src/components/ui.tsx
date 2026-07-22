import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        outline: "border border-border bg-card hover:border-primary/25 hover:bg-primary/[0.035]",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      size: { sm: "h-9 px-3", default: "h-10 px-4", lg: "h-11 px-5", icon: "h-10 w-10" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("premium-card", className)} {...props} />; }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex items-start justify-between gap-4 p-5 pb-3", className)} {...props} />; }
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("text-[15px] font-semibold tracking-[-0.01em]", className)} {...props} />; }
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("mt-1 text-xs leading-5 text-muted-foreground", className)} {...props} />; }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-5 pt-2", className)} {...props} />; }

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary-subtle text-primary",
      success: "bg-success-subtle text-success",
      warning: "bg-warning-subtle text-warning",
      danger: "bg-destructive/10 text-destructive",
      neutral: "bg-muted text-muted-foreground",
      outline: "border border-border bg-card text-muted-foreground"
    }
  }, defaultVariants: { variant: "default" }
});
export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) { return <span className={cn(badgeVariants({ variant }), className)} {...props} />; }

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-xl border border-input bg-card px-3 text-sm placeholder:text-muted-foreground/70 transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10", className)} {...props}>{children}</select>;
}

export function Separator({ className }: { className?: string }) { return <div className={cn("h-px bg-border", className)} />; }
export function Skeleton({ className }: { className?: string }) { return <div className={cn("skeleton h-4", className)} />; }
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><div className="mb-4 rounded-2xl bg-muted p-3 text-muted-foreground">{icon}</div><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Progress({ value, className }: { value: number; className?: string }) { return <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}><div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-[28px]">{title}</h1>{description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}
