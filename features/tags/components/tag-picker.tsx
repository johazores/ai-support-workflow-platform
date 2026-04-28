"use client";

import { useEffect, useState } from "react";
import { TagBadge } from "@/features/tags/components/tag-badge";
import {
  fetchTags,
  setTicketTags,
} from "@/features/tags/services/tag-client-service";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type TagPickerProps = {
  ticketId: string;
  initialTagIds: string[];
};

export function TagPicker({ ticketId, initialTagIds }: TagPickerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags()
      .then(setAllTags)
      .catch(() => {});
  }, []);

  async function toggleTag(tagId: string) {
    const next = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];

    setSelectedIds(next);
    setSaving(true);

    try {
      await setTicketTags(ticketId, next);
    } catch {
      setSelectedIds(selectedIds); // revert on error
    } finally {
      setSaving(false);
    }
  }

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-slate-500">Tags</p>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          {isOpen ? "Done" : "Edit"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {selectedTags.length === 0 && !isOpen && (
          <span className="text-xs text-slate-400">No tags</span>
        )}

        {selectedTags.map((tag) => (
          <TagBadge key={tag.id} name={tag.name} color={tag.color} />
        ))}
      </div>

      {isOpen && (
        <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {allTags.length === 0 && (
            <p className="text-xs text-slate-400">No tags created yet</p>
          )}

          {allTags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-white"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
                disabled={saving}
                className="rounded border-slate-300"
              />
              <TagBadge name={tag.name} color={tag.color} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
