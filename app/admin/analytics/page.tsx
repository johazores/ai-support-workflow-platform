import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ticket volume, response times, and breakdown by status and priority.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
