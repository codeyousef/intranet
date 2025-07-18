import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-flyadeal-purple text-white hover:bg-flyadeal-purple/90",
        destructive: "bg-flyadeal-red text-white hover:bg-flyadeal-red/90",
        outline: "border border-flyadeal-purple text-flyadeal-purple hover:bg-flyadeal-purple hover:text-white",
        secondary: "bg-flyadeal-yellow text-flyadeal-purple hover:bg-flyadeal-yellow/80",
        ghost: "text-black dark:text-white hover:bg-flyadeal-purple/10 hover:text-black dark:hover:text-white",
        link: "text-flyadeal-purple underline-offset-4 hover:underline",
        glass: "glass-morphism text-black dark:text-white border-white/20 hover:bg-white/20"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
