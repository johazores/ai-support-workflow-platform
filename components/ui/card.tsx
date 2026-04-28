import React, { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
