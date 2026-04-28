"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUsers } from "@/features/auth/services/user-client-service";

type User = { id: string; name: string; email: string };

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  "aria-label"?: string;
};

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 5,
  "aria-label": ariaLabel,
}: MentionInputProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);

  const filtered = query
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase()),
      )
    : users;

  const detectMention = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const textBefore = value.slice(0, pos);
    const match = textBefore.match(/@(\w*)$/);

    if (match) {
      setQuery(match[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  function insertMention(user: User) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const textBefore = value.slice(0, pos);
    const match = textBefore.match(/@(\w*)$/);

    if (match) {
      const start = pos - match[0].length;
      const newValue =
        value.slice(0, start) + `@${user.name} ` + value.slice(pos);
      onChange(newValue);
    }

    setShowSuggestions(false);
    textarea.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTimeout(detectMention, 0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        aria-label={ariaLabel}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
      />

      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filtered.slice(0, 8).map((user, i) => (
            <li key={user.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span className="font-medium">{user.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {user.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
