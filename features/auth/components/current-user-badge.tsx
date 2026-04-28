type CurrentUserBadgeProps = {
  name: string;
  role: string;
};

export function CurrentUserBadge({ name, role }: CurrentUserBadgeProps) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{name}</p>
      <p className="text-xs capitalize text-slate-500">{role}</p>
    </div>
  );
}
