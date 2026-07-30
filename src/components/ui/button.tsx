import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-medium tracking-wide transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-[#8F1824] hover:shadow-md",
        outline:
          "border border-primary text-primary hover:bg-accent hover:text-[#8F1824]",
        secondary:
          "bg-accent text-primary hover:bg-[#EFDADD]",
        ghost:
          "text-foreground hover:bg-accent hover:text-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-12 rounded-full px-8 text-sm",
        xs: "h-8 rounded-full px-4 text-xs",
        sm: "h-10 rounded-full px-6 text-sm",
        lg: "h-14 rounded-full px-10 text-base",
        icon: "h-12 w-12 rounded-full",
        "icon-xs": "h-8 w-8 rounded-full",
        "icon-sm": "h-10 w-10 rounded-full",
        "icon-lg": "h-14 w-14 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      render={render}
      nativeButton={nativeButton ?? (render ? false : true)}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
