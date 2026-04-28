"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { fetchCustomers } from "@/features/customers/services/customer-client-service";

type Customer = {
  id: string;
  name: string;
  email: string;
  ticketCount: number;
  createdAt: string;
};

export function CustomerDirectory() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch(() => toast("Failed to load customers", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-500">
        Loading customers...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        aria-label="Search customers"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No customers found"
          description={
            search
              ? "Try adjusting your search."
              : "Customers will appear here when tickets are created."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Tickets
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    First Seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {customer.name.charAt(0)}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {customer.email}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {customer.ticketCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(customer.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-3 text-center text-xs text-slate-400 dark:border-slate-700">
            {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
          </div>
        </div>
      )}
    </div>
  );
}
