"use client"

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, Copy, Power, Package } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "next-intl";

interface VoucherBenefit {
  scope: "cart" | "shipping" | "payment";
  type: "fixed_amount" | "percentage" | "free_shipping";
  paymentMethod?: string;
  isAutomatic?: boolean;
  value?: number;
  maxDiscountAmount?: number;
}

interface Voucher {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  code: string;
  status: "draft" | "active" | "paused";
  startsAt: string;
  endsAt: string;
  minimumCartSubtotal?: number;
  benefit: VoucherBenefit;
  productIds: string[];
  totalUsageLimit?: number;
  usagePerCustomer?: number;
  consumedQuantity: number;
  _count?: { usages: number };
}

type FilterTab = "all" | "active" | "paused" | "draft" | "expired";

export default function AdminDiscountsPage() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data, isLoading, isError } = useQuery<{ vouchers: Voucher[] }>({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vouchers");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/${locale}/admin/login`;
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch vouchers");
      }
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete voucher");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Voucher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete voucher");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await fetch(`/api/admin/vouchers/${voucherId}/toggle-status`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: () => {
      toast.error("Failed to toggle voucher status");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (voucherId: string) => {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate voucher");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Duplicated as "${data.voucher.code}"`);
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
    onError: () => {
      toast.error("Failed to duplicate voucher");
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the voucher "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatBenefit = (benefit: VoucherBenefit) => {
    if (benefit.scope === "cart") {
      if (benefit.type === "fixed_amount") {
        return `${(benefit.value || 0).toLocaleString()} đ off`;
      }
      if (benefit.type === "percentage") {
        const cap = benefit.maxDiscountAmount
          ? ` (max ${benefit.maxDiscountAmount.toLocaleString()} đ)`
          : "";
        return `${benefit.value}% off${cap}`;
      }
    } else if (benefit.scope === "shipping") {
      if (benefit.type === "fixed_amount") {
        return `Freeship max ${(benefit.value || 0).toLocaleString()} đ`;
      }
      if (benefit.type === "free_shipping") {
        return "Free shipping";
      }
    } else if (benefit.scope === "payment") {
      const pmLabel = benefit.paymentMethod === "vnpay" ? "VNPAY/QR" : benefit.paymentMethod === "cod" ? "COD" : "Online/QR";
      const autoLabel = benefit.isAutomatic !== false ? " (Tự động)" : "";
      if (benefit.type === "fixed_amount") {
        return `Giảm ${(benefit.value || 0).toLocaleString()} đ (${pmLabel})${autoLabel}`;
      }
      if (benefit.type === "percentage") {
        return `Giảm ${benefit.value}% (${pmLabel})${autoLabel}`;
      }
    }
    return "N/A";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
      case "paused":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
      default:
        return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400";
    }
  };

  const isExpired = (endsAt: string) => new Date(endsAt) < new Date();

  const filteredVouchers = (data?.vouchers || []).filter((v) => {
    if (activeTab === "all") return true;
    if (activeTab === "expired") return isExpired(v.endsAt);
    return v.status === activeTab && !isExpired(v.endsAt);
  });

  const counts = {
    all: data?.vouchers?.length || 0,
    active: data?.vouchers?.filter((v) => v.status === "active" && !isExpired(v.endsAt)).length || 0,
    paused: data?.vouchers?.filter((v) => v.status === "paused" && !isExpired(v.endsAt)).length || 0,
    draft: data?.vouchers?.filter((v) => v.status === "draft" && !isExpired(v.endsAt)).length || 0,
    expired: data?.vouchers?.filter((v) => isExpired(v.endsAt)).length || 0,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "draft", label: "Draft" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discounts & Vouchers</h1>
          <p className="text-muted-foreground text-xs">Manage your store promotional campaigns and shipping discount codes.</p>
        </div>
        <Button render={<Link href={`/${locale}/admin/discounts/new`} />} className="flex items-center gap-1.5 h-9 px-4 rounded-none">
          <Plus className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Add Voucher</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-0 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-none border bg-card shadow-none overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary/70" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-destructive">
            Failed to load vouchers. Please refresh the page.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b">
                <TableHead className="text-xs font-bold uppercase tracking-wider">Code</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Benefit</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Min. Subtotal</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Usage</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Period</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVouchers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-xs">
                    {activeTab === "all"
                      ? 'No vouchers found. Click "Add Voucher" to create your first promotion code.'
                      : `No ${activeTab} vouchers found.`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVouchers.map((voucher) => {
                  const expired = isExpired(voucher.endsAt);
                  const usagePercent = voucher.totalUsageLimit
                    ? Math.round((voucher.consumedQuantity / voucher.totalUsageLimit) * 100)
                    : null;

                  return (
                    <TableRow key={voucher.id} className={`border-b ${expired ? "opacity-50" : "hover:bg-muted/10"}`}>
                      {/* Code + Name */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs">{voucher.code}</span>
                            {voucher.productIds.length > 0 && (
                              <span title="Product-scoped" className="text-orange-500">
                                <Package className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{voucher.name}</span>
                        </div>
                      </TableCell>

                      {/* Benefit */}
                      <TableCell className="text-xs">{formatBenefit(voucher.benefit)}</TableCell>

                      {/* Min Subtotal */}
                      <TableCell className="text-xs tabular-nums">
                        {voucher.minimumCartSubtotal
                          ? `${voucher.minimumCartSubtotal.toLocaleString()} đ`
                          : "—"}
                      </TableCell>

                      {/* Usage with progress bar */}
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <span className="text-xs tabular-nums">
                            <span className="font-semibold text-primary">{voucher.consumedQuantity}</span>
                            {voucher.totalUsageLimit ? ` / ${voucher.totalUsageLimit}` : " / ∞"}
                          </span>
                          {usagePercent !== null && (
                            <div className="h-1 w-full bg-muted rounded-none overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  usagePercent >= 90 ? "bg-red-500" : usagePercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {expired ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-red-500/15 text-red-600 dark:text-red-400">
                            expired
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getStatusColor(voucher.status)}`}>
                            {voucher.status}
                          </span>
                        )}
                      </TableCell>

                      {/* Period */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(voucher.startsAt).toLocaleDateString()} –{" "}
                        {new Date(voucher.endsAt).toLocaleDateString()}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          {/* Toggle active/paused */}
                          {!expired && voucher.status !== "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleMutation.mutate(voucher.id)}
                              className="h-7 w-7 hover:bg-muted"
                              disabled={toggleMutation.isPending}
                              title={voucher.status === "active" ? "Pause" : "Activate"}
                            >
                              <Power className={`w-3 h-3 ${voucher.status === "active" ? "text-emerald-500" : "text-muted-foreground"}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            render={<Link href={`/${locale}/admin/discounts/${voucher.id}/edit`} />}
                            className="h-7 w-7 hover:bg-muted"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3 text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateMutation.mutate(voucher.id)}
                            className="h-7 w-7 hover:bg-muted"
                            disabled={duplicateMutation.isPending}
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3 text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voucher.id, voucher.name)}
                            className="h-7 w-7 hover:bg-destructive/10"
                            disabled={deleteMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
