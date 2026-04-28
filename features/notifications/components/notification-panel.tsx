import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  ticketId: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationPanelProps = {
  notifications: Notification[];
};

export function NotificationPanel({ notifications }: NotificationPanelProps) {
  if (notifications.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
        <p className="text-center text-sm text-slate-400">
          No notifications yet
        </p>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Notifications
        </h3>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`border-b border-slate-50 px-4 py-3 ${
              !notification.isRead ? "bg-blue-50/40" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {!notification.isRead && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {notification.message}
                </p>

                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">
                    {formatTime(notification.createdAt)}
                  </span>

                  {notification.ticketId && (
                    <Link
                      href={`/inbox/${notification.ticketId}`}
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      View ticket
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
