type StatusBadgeProps = {
  status: "open" | "pending" | "closed";
  showDot?: boolean;
};

const statusLabels = {
  open: "Open",
  pending: "Pending",
  closed: "Closed",
};

const statusStyles = {
  open: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  closed: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
  },
};

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ring-1 ${styles.bg} ${styles.text} ${styles.ring}`}
    >
      {showDot && (
        <span className={`inline-block h-2 w-2 rounded-full bg-current`} />
      )}
      {statusLabels[status]}
    </span>
  );
}
