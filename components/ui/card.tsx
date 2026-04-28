import React, { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  noBorder?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { children, hover = true, noBorder = false, className = "", ...props },
    ref,
  ) => {
    const baseStyles = "rounded-2xl bg-white p-5 transition-all duration-200";
    const borderStyles = noBorder ? "" : "border border-slate-200";
    const hoverStyles = hover
      ? "hover:shadow-md hover:border-slate-300"
      : "shadow-sm";
    const shadowStyles = !hover ? "shadow-sm" : "";

    const finalClassName = `
      ${baseStyles}
      ${borderStyles}
      ${hoverStyles}
      ${shadowStyles}
      ${className}
    `.trim();

    return (
      <div ref={ref} className={finalClassName} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
