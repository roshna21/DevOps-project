import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import React from "react";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus-visible:pastel-focus disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-slate-900 text-white hover:bg-slate-800 shadow-soft px-4 py-2",
        secondary:
          "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 px-4 py-2",
        pastel:
          "bg-pastelLavender text-slate-800 hover:bg-pastelLavender/80 px-4 py-2"
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-5 py-2.5 text-base"
      },
      width: {
        auto: "",
        full: "w-full"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      width: "auto"
    }
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  width,
  leftIcon,
  rightIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={twMerge(buttonStyles({ variant, size, width }), className)} {...props}>
      {leftIcon && <span className="mr-2 -ml-1">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 -mr-1">{rightIcon}</span>}
    </button>
  );
}


