import React, { InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-500 transition-all duration-200 focus:outline-none dark:text-slate-100 dark:placeholder-slate-400";

    const stateStyles = error
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-red-500 dark:focus:ring-red-900"
      : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:focus:border-slate-500 dark:focus:ring-slate-700";

    const disabledStyles = disabled
      ? "bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
      : "bg-white dark:bg-slate-800";

    const widthStyles = fullWidth ? "w-full" : "";

    const finalInputClassName = `
      ${baseStyles}
      ${stateStyles}
      ${disabledStyles}
      ${widthStyles}
      ${className}
    `.trim();

    const autoId = useId();
    const inputId = props.id || autoId;

    return (
      <div className={widthStyles}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={finalInputClassName}
          {...props}
        />
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
