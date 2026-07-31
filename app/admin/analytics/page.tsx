import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Reporting
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Analytics
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Track ticket volume, first-response time, status, and priority trends.
        </p>
      </div>

      <AnalyticsDashboard />
    </section>
  );
}
