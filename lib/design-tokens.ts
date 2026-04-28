/**
 * Design Tokens - Centralized color, spacing, and typography definitions
 * This file serves as a single source of truth for the design system
 */

export const designTokens = {
  // Colors
  colors: {
    // Neutral palette
    slate: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
    // Status colors
    status: {
      open: "#10b981", // success/emerald
      pending: "#d97706", // warning/amber
      closed: "#64748b", // neutral/slate
    },
    // Semantic colors
    success: "#10b981",
    warning: "#d97706",
    error: "#ef4444",
    info: "#3b82f6",
    // Status-specific backgrounds
    backgrounds: {
      open: "#d1fae5", // emerald-100
      pending: "#fef3c7", // amber-100
      closed: "#e2e8f0", // slate-200
    },
    // Status-specific text
    text: {
      open: "#065f46", // emerald-900
      pending: "#92400e", // amber-900
      closed: "#334155", // slate-700
    },
  },

  // Spacing scale (matches Tailwind + custom)
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
    "3xl": "3rem",
  },

  // Border radius
  borderRadius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
  },

  // Shadows
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },

  // Transitions
  transitions: {
    fast: "150ms ease-in-out",
    base: "200ms ease-in-out",
    slow: "300ms ease-in-out",
  },

  // Typography
  typography: {
    heading: {
      h1: "text-3xl font-bold text-slate-950",
      h2: "text-2xl font-bold text-slate-950",
      h3: "text-xl font-semibold text-slate-900",
    },
    body: {
      default: "text-sm text-slate-700",
      large: "text-base text-slate-700",
    },
    label: "text-sm font-medium text-slate-700",
    caption: "text-xs text-slate-500",
    error: "text-xs text-red-600",
  },

  // Component-specific styles
  components: {
    button: {
      primary:
        "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-base",
      secondary:
        "rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-base",
      tertiary:
        "px-0 py-0 text-sm font-medium text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-950 disabled:opacity-60 transition-colors duration-base",
    },
    input: {
      base: "rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all duration-base",
      error:
        "rounded-xl border border-red-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100",
      disabled:
        "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed",
    },
    card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-base",
    alert: {
      success:
        "rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200",
      error:
        "rounded-lg bg-red-50 p-4 text-sm text-red-800 border border-red-200",
      warning:
        "rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200",
      info: "rounded-lg bg-blue-50 p-4 text-sm text-blue-800 border border-blue-200",
    },
  },
};

// Helper to get status style based on status type
export const getStatusStyles = (status: "open" | "pending" | "closed") => {
  const statusMap = {
    open: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      dotColor: "#10b981",
    },
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      dotColor: "#d97706",
    },
    closed: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      ring: "ring-slate-200",
      dotColor: "#64748b",
    },
  };
  return statusMap[status];
};

// Helper to get priority color
export const getPriorityColor = (priority: "low" | "medium" | "high") => {
  const priorityMap = {
    low: "text-slate-600",
    medium: "text-amber-600",
    high: "text-red-600",
  };
  return priorityMap[priority];
};
