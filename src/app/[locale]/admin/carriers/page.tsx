"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import {
  Truck,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Boxes,
  Loader2,
  RefreshCw,
  Clock,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CarrierItem } from "@/app/api/admin/carriers/route";

export default function AdminCarriersPage() {
  const t = useTranslations("AdminCarriers");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingCarrier, setEditingCarrier] = useState<CarrierItem | null>(null);

  // Edit form state
  const [editBaseFee, setEditBaseFee] = useState<number>(25000);
  const [editEnabled, setEditEnabled] = useState<boolean>(true);
  const [editServiceTypeId, setEditServiceTypeId] = useState<number>(1);

  // ── 1. Fetch Carriers via TanStack Query ─────────────────────
  const { data, isLoading, isError, refetch } = useQuery<{ carriers: CarrierItem[] }>({
    queryKey: ["admin-carriers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/carriers");
      if (!res.ok) throw new Error("Failed to fetch carriers");
      return res.json();
    },
    staleTime: 30_000,
  });

  const carriers = data?.carriers || [];

  // ── 2. Toggle Carrier Status Mutation ────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ carrier, enabled, baseFee, serviceType }: { carrier: string; enabled: boolean; baseFee?: number; serviceType?: number }) => {
      const res = await fetch("/api/admin/carriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrier, enabled, baseFee, serviceType }),
      });
      if (!res.ok) throw new Error("Failed to update carrier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-carriers"] });
      queryClient.invalidateQueries({ queryKey: ["shipping-carriers"] });
      toast.success(t("updated"));
      setEditingCarrier(null);
    },
    onError: () => {
      toast.error(t("loadError"));
    },
  });

  // Filter carriers
  const filteredCarriers = carriers.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.serviceType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? item.enabled
        : !item.enabled;

    return matchesSearch && matchesStatus;
  });

  const activeCount = carriers.filter((c) => c.enabled).length;
  const instantCount = carriers.filter((c) => c.code === "grab" && c.enabled).length;
  const apiConnectedCount = carriers.filter((c) => c.isApiConfigured).length;

  const handleOpenEdit = (carrier: CarrierItem) => {
    setEditingCarrier(carrier);
    setEditBaseFee(carrier.baseFee);
    setEditEnabled(carrier.enabled);
    setEditServiceTypeId(carrier.serviceTypeId);
  };

  const handleSaveEdit = () => {
    if (!editingCarrier) return;
    toggleMutation.mutate({
      carrier: editingCarrier.code,
      enabled: editEnabled,
      baseFee: editBaseFee,
      serviceType: editServiceTypeId,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => refetch()}
            className="h-8 rounded-none text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button
            render={<Link href={`/${locale}/admin/settings/shipping`} />}
            size="xs"
            className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
          >
            <Settings className="h-3.5 w-3.5 mr-1" />
            SPX API Settings
          </Button>
        </div>
      </div>

      {/* ── Metric Highlights Bar ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border p-3 bg-card rounded-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Carriers</span>
          <div className="text-xl font-bold mt-1 flex items-center justify-between">
            {carriers.length}
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="border border-border p-3 bg-card rounded-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active in Checkout</span>
          <div className="text-xl font-bold mt-1 text-primary flex items-center justify-between">
            {activeCount}
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="border border-border p-3 bg-card rounded-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Instant (2H Delivery)</span>
          <div className="text-xl font-bold mt-1 flex items-center justify-between">
            {instantCount}
            <Zap className="h-4 w-4 text-foreground/80" />
          </div>
        </div>

        <div className="border border-border p-3 bg-card rounded-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">API Connected</span>
          <div className="text-xl font-bold mt-1 flex items-center justify-between">
            {apiConnectedCount}
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-muted/20 p-2.5 border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-background rounded-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Filter:</span>
          {(["all", "active", "inactive"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={statusFilter === mode ? "default" : "outline"}
              size="xs"
              onClick={() => setStatusFilter(mode)}
              className={`h-7 text-[10px] uppercase tracking-wider font-bold rounded-none ${
                statusFilter === mode ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {mode === "all" ? t("allStatuses") : mode === "active" ? t("active") : t("inactive")}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Carrier List Table Grid ────────────────────────────────── */}
      <div className="border border-border bg-card rounded-none overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {t("loading")}
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-destructive flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4" />
            {t("loadError")}
          </div>
        ) : filteredCarriers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCarriers.map((carrier) => (
              <div
                key={carrier.id}
                className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
              >
                {/* Left: Carrier Identity & Specs */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 border border-border bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold text-xs uppercase shrink-0 rounded-none tracking-wider">
                    {carrier.logoBadge}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold uppercase tracking-wider truncate">
                        {carrier.name}
                      </h3>
                      {carrier.enabled ? (
                        <span className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none">
                          {t("active")}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none">
                          {t("inactive")}
                        </span>
                      )}
                      {carrier.code === "spx" && (
                        <span className="border border-border text-[9px] font-medium px-1.5 py-0.5 text-muted-foreground uppercase rounded-none flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-primary" /> API Sync
                        </span>
                      )}
                      {carrier.code === "grab" && (
                        <span className="bg-primary/10 text-primary text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Instant 2H
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {carrier.estimatedDelivery}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <DollarSign className="h-3 w-3 text-muted-foreground" /> Base Fee: {carrier.baseFee.toLocaleString("vi-VN")} ₫
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Service: {carrier.serviceType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-2 border border-border px-2.5 py-1 bg-background">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Checkout</span>
                    <Switch
                      checked={carrier.enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          carrier: carrier.code,
                          enabled: checked,
                          baseFee: carrier.baseFee,
                          serviceType: carrier.serviceTypeId,
                        })
                      }
                      aria-label={`Toggle ${carrier.name}`}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleOpenEdit(carrier)}
                    className="h-8 text-xs rounded-none uppercase tracking-wider font-bold"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Configure
                  </Button>

                  {carrier.code === "spx" && (
                    <Button
                      render={<Link href={`/${locale}/admin/settings/shipping`} />}
                      variant="ghost"
                      size="xs"
                      className="h-8 text-xs rounded-none text-muted-foreground hover:text-foreground"
                      title="API Settings"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Carrier Settings Dialog Modal ──────────────────────── */}
      <Dialog open={editingCarrier !== null} onOpenChange={(open) => !open && setEditingCarrier(null)}>
        <DialogContent className="rounded-none sm:max-w-md p-4 [&_[data-slot=dialog-close]]:rounded-none border-border">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {t("edit")}: {editingCarrier?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure checkout rate, delivery SLA, and activation for this carrier.
            </DialogDescription>
          </DialogHeader>

          {editingCarrier && (
            <div className="grid gap-3 py-3">
              <div className="flex items-center justify-between border p-2.5 bg-muted/20">
                <Label htmlFor="enabled-switch" className="text-xs font-bold uppercase tracking-wider">
                  Enable for Checkout
                </Label>
                <Switch
                  id="enabled-switch"
                  checked={editEnabled}
                  onCheckedChange={setEditEnabled}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="baseFee" className="text-xs uppercase tracking-widest font-bold">
                  {t("baseFee")} (VND)
                </Label>
                <Input
                  id="baseFee"
                  type="number"
                  min="0"
                  step="1000"
                  value={editBaseFee}
                  onChange={(e) => setEditBaseFee(Number(e.target.value) || 0)}
                  className="h-9 text-xs rounded-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Default flat shipping rate applied at storefront checkout.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="serviceType" className="text-xs uppercase tracking-widest font-bold">
                  {t("serviceType")} Mode
                </Label>
                <select
                  id="serviceType"
                  value={editServiceTypeId}
                  onChange={(e) => setEditServiceTypeId(Number(e.target.value))}
                  className="h-9 border border-border bg-background px-3 text-xs rounded-none w-full"
                >
                  <option value={1}>Standard Service (Standard / Nhanh)</option>
                  <option value={2}>Express / Instant Service (Hỏa Tốc 2H)</option>
                  <option value={3}>Economy Service (Tiết Kiệm)</option>
                </select>
              </div>

              {editingCarrier.code === "spx" && (
                <div className="border border-border p-2.5 bg-primary/5 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    SPX API Credentials Available
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Real-time dynamic SPX rates and automatic waybill generation can be configured in SPX API Settings.
                  </p>
                  <Link
                    href={`/${locale}/admin/settings/shipping`}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1 text-[11px] mt-1"
                  >
                    Manage SPX API Keys <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setEditingCarrier(null)}
              className="h-8 rounded-none text-xs"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={handleSaveEdit}
              disabled={toggleMutation.isPending}
              className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
            >
              {toggleMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                t("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
