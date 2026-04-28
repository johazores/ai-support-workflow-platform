"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api-client";

type CsatRating = {
  id: string;
  ticketId: string;
  score: number;
  comment: string | null;
};

const EMOJIS = ["😞", "😕", "😐", "🙂", "😍"];

export function CsatWidget({
  ticketId,
  ticketStatus,
}: {
  ticketId: string;
  ticketStatus: string;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState<CsatRating | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient<{ data: CsatRating | null }>(`/api/tickets/${ticketId}/csat`)
      .then((res) => {
        setRating(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [ticketId]);

  if (ticketStatus !== "closed" || !loaded) return null;

  async function handleSubmit(score: number) {
    setSubmitting(true);
    try {
      const res = await apiClient<{ data: CsatRating }>(
        `/api/tickets/${ticketId}/csat`,
        {
          method: "POST",
          body: { score, comment: comment || undefined },
        },
      );
      setRating(res.data);
      toast("Thanks for your feedback!");
    } catch {
      toast("Failed to submit rating", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (rating) {
    return (
      <div className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-100 dark:bg-green-900/20 dark:ring-green-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
          Customer Satisfaction
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl">{EMOJIS[rating.score - 1]}</span>
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {rating.score}/5
          </span>
        </div>
        {rating.comment && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            &ldquo;{rating.comment}&rdquo;
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
        Rate this resolution
      </p>
      <div className="mt-3 flex gap-2">
        {EMOJIS.map((emoji, i) => {
          const score = i + 1;
          return (
            <button
              key={score}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              onClick={() => handleSubmit(score)}
              className={`text-2xl transition-transform ${
                hoveredScore !== null && score <= hoveredScore
                  ? "scale-125"
                  : "opacity-60 hover:opacity-100"
              }`}
              aria-label={`Rate ${score} out of 5`}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-blue-700 dark:bg-slate-800 dark:text-slate-200"
      />
    </div>
  );
}
