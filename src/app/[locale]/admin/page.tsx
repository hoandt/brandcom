"use client"

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

interface Metrics {
  revenue: number;
  ordersCount: number;
}

export default function AdminDashboardPage() {
  const locale = useLocale();
  const { data, isLoading, isError } = useQuery<Metrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/${locale}/admin/login`;
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch metrics");
      }
      return res.json();
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {isError ? (
        <div className="text-xs text-destructive py-4">
          Failed to load dashboard metrics.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-none border bg-card text-card-foreground shadow-none p-3.5">
            <div className="flex flex-row items-center justify-between space-y-0 pb-1">
              <h3 className="tracking-tight text-xs font-medium uppercase text-muted-foreground">Total Revenue</h3>
            </div>
            <div className="text-xl font-bold">
              {isLoading || !data ? <MetricSkeleton /> : `${data.revenue.toLocaleString()} đ`}
            </div>
            <p className="text-[10px] text-muted-foreground">Lifetime accumulated sales</p>
          </div>
          <div className="rounded-none border bg-card text-card-foreground shadow-none p-3.5">
            <div className="flex flex-row items-center justify-between space-y-0 pb-1">
              <h3 className="tracking-tight text-xs font-medium uppercase text-muted-foreground">Orders</h3>
            </div>
            <div className="text-xl font-bold">
              {isLoading || !data ? <MetricSkeleton /> : `+${data.ordersCount.toLocaleString()}`}
            </div>
            <p className="text-[10px] text-muted-foreground">Total orders processed</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricSkeleton() {
  return <span className="my-1 block h-6 w-28 animate-pulse bg-muted" aria-label="Loading metric" />;
}
