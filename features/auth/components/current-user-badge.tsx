type CurrentUserBadgeProps = {
  name: string;
  role: string;
};

export function CurrentUserBadge({ name, role }: CurrentUserBadgeProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600">
        {name.charAt(0)}
      </span>
      <div className="text-sm leading-tight">
        <p className="font-medium text-slate-900">{name}</p>
        <p className="text-[11px] capitalize text-slate-500">{role}</p>
      </div>
    </div>
  );
}
