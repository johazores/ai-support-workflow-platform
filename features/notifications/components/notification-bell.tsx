"use client";

import { useState, useEffect, useRef } from "react";
import {
  fetchNotifications,
  markAllRead,
} from "@/features/notifications/services/notification-client-service";
import { NotificationPanel } from "@/features/notifications/components/notification-panel";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      ticketId: string | null;
      isRead: boolean;
      createdAt: string;
    }>
  >([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch count on mount and every 30 seconds
  useEffect(() => {
    async function load() {
      try {
        const result = await fetchNotifications();
        setNotifications(result.data);
        setUnreadCount(result.unreadCount);
      } catch {
        // Silently fail — not critical
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  async function handleOpen() {
    setIsOpen((prev) => !prev);

    if (!isOpen && unreadCount > 0) {
      await markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationPanel notifications={notifications} />}
    </div>
  );
}
