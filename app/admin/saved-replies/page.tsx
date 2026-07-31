import { requirePermission } from "@/features/auth/services/auth-guard-service";
import { SavedReplyManager } from "@/features/saved-replies/components/saved-reply-manager";

export default async function SavedRepliesPage() {
  await requirePermission("saved-replies:manage");

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Knowledge
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Saved replies
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Maintain reusable response templates for faster, more consistent
          support.
        </p>
      </div>

      <SavedReplyManager />
    </section>
  );
}
