import React, { SelectHTMLAttributes, useId } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      options = [],
      className = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "rounded-xl border px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:outline-none";

    const stateStyles = error
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      : "border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

    const disabledStyles = disabled
      ? "bg-slate-50 text-slate-500 cursor-not-allowed"
      : "bg-white";

    const widthStyles = fullWidth ? "w-full" : "";

    const finalSelectClassName = `
      ${baseStyles}
      ${stateStyles}
      ${disabledStyles}
      ${widthStyles}
      ${className}
    `.trim();

    const autoId = useId();
    const selectId = props.id || autoId;

    return (
      <div className={widthStyles}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={finalSelectClassName}
          {...props}
        >
          {options.length > 0
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
