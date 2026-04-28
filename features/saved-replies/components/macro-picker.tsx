"use client";

import { useEffect, useState, useRef } from "react";
import { fetchSavedReplies } from "@/features/saved-replies/services/saved-reply-client-service";

type SavedReply = {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
};

type MacroPickerProps = {
  onSelect: (body: string) => void;
  context?: {
    customerName?: string;
    ticketSubject?: string;
  };
};

function interpolate(
  template: string,
  context: MacroPickerProps["context"],
): string {
  return template
    .replace(/\{\{customer\.name\}\}/g, context?.customerName ?? "Customer")
    .replace(
      /\{\{ticket\.subject\}\}/g,
      context?.ticketSubject ?? "your request",
    );
}

export function MacroPicker({ onSelect, context }: MacroPickerProps) {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSavedReplies().then(setReplies).catch(() => {});
  }, []);

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

  const filtered = replies.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(search.toLowerCase())),
  );

  if (replies.length === 0) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-medium text-blue-600 hover:text-blue-800"
      >
        Insert template
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-64 rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-3 text-xs text-slate-400">No templates found</p>
            )}

            {filtered.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => {
                  onSelect(interpolate(reply.body, context));
                  setIsOpen(false);
                  setSearch("");
                }}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">
                  {reply.title}
                </span>
                {reply.shortcut && (
                  <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500">
                    {reply.shortcut}
                  </span>
                )}
                <p className="mt-0.5 truncate text-slate-500">{reply.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
