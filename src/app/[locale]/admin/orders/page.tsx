import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ChevronRight, ArrowUpDown, Calendar, User, CreditCard } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; payment?: string }>;
};

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status, payment } = await searchParams;

  // Filter query
  const whereClause: any = {};
  if (status && status !== "ALL") {
    whereClause.orderStatus = status;
  }
  if (payment && payment !== "ALL") {
    whereClause.paymentStatus = payment;
  }

  // Fetch orders from db
  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: { items: true }
  });

  const orderStatuses = ["ALL", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
  const paymentStatuses = ["ALL", "PENDING", "PAID", "REFUNDED"];

  const getStatusColor = (s: string) => {
    switch (s) {
      case "PROCESSING": return "bg-blue-100 text-blue-800 border-blue-200";
      case "SHIPPED": return "bg-purple-100 text-purple-800 border-purple-200";
      case "DELIVERED": return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusColor = (s: string) => {
    switch (s) {
      case "PAID": return "bg-green-100 text-green-800 border-green-200";
      case "REFUNDED": return "bg-amber-100 text-amber-800 border-amber-200";
      case "PENDING": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground text-xs">Fulfill orders, adjust shipping statuses and log payment captures</p>
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex flex-col md:flex-row gap-3 justify-between border-b pb-3">
        {/* Order Status Filters */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Order Status</span>
          <div className="flex flex-wrap gap-1">
            {orderStatuses.map((s) => {
              const active = (!status && s === "ALL") || status === s;
              return (
                <Link
                  key={s}
                  href={`/${locale}/admin/orders?status=${s}${payment ? `&payment=${payment}` : ""}`}
                  className={`text-xs px-2.5 py-1 rounded-none border font-bold transition-all ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Payment Status Filters */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Payment Status</span>
          <div className="flex flex-wrap gap-1">
            {paymentStatuses.map((s) => {
              const active = (!payment && s === "ALL") || payment === s;
              return (
                <Link
                  key={s}
                  href={`/${locale}/admin/orders?payment=${s}${status ? `&status=${status}` : ""}`}
                  className={`text-xs px-2.5 py-1 rounded-none border font-bold transition-all ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-card border rounded-none overflow-hidden shadow-none">
        {orders.length > 0 ? (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 font-heading uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-2.5 text-left">Order Number</th>
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Customer</th>
                <th className="px-4 py-2.5 text-left">Total</th>
                <th className="px-4 py-2.5 text-left">Payment</th>
                <th className="px-4 py-2.5 text-left">Order Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-foreground text-xs">
                    <Link
                      href={`/${locale}/admin/orders/${order.id}`}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-light text-xs">
                    {new Date(order.createdAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-foreground text-xs">{order.customerName}</div>
                    <div className="text-[10px] text-muted-foreground">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-foreground text-xs">
                    {formatPrice(Number(order.totalAmount), locale)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-light">
                        {order.paymentMethod}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/${locale}/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                    >
                      Manage
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-light text-sm">No orders found matching selection</p>
          </div>
        )}
      </div>
    </div>
  );
}
