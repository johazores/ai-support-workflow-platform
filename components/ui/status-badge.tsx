type StatusBadgeProps = {
  status: "open" | "pending" | "closed";
};

const statusStyles = {
  open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  closed: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
