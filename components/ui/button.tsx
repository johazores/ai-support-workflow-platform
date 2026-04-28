import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

    const variantStyles = {
      primary:
        "bg-slate-950 text-white hover:bg-slate-900 focus:ring-slate-950 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-400",
      secondary:
        "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-950 dark:border-slate-600 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
      tertiary:
        "text-slate-700 hover:text-slate-900 focus:ring-slate-950 px-0 dark:text-slate-300 dark:hover:text-slate-100",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    const finalClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${variant !== "tertiary" ? sizeStyles[size] : ""}
      ${widthStyles}
      ${className}
    `.trim();

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={finalClassName}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
