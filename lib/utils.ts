/**
 * Merge class names, filtering out falsy values.
 *
 * Usage: cn("base", condition && "conditional", className)
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Format an ISO date string into a human-readable date + time.
 *
 * Example: "Apr 29, 2026, 10:34 AM"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO date string into a short date + time (no year).
 *
 * Example: "Apr 29, 10:34 AM"
 */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format an ISO date string into a relative time string.
 *
 * Examples: "just now", "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
