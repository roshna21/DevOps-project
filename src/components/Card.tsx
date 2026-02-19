import React from "react";
import { twMerge } from "tailwind-merge";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Card({ className, header, footer, children, ...props }: CardProps) {
  return (
    <div className={twMerge("pastel-card p-6", className)} {...props}>
      {header && <div className="mb-4">{header}</div>}
      <div>{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}


