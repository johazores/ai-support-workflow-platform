const colorMap: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

type TagBadgeProps = {
  name: string;
  color?: string;
};

export function TagBadge({ name, color = "slate" }: TagBadgeProps) {
  const classes = colorMap[color] ?? colorMap.slate;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {name}
    </span>
  );
}
