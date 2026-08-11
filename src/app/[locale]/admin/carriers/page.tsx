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
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Boxes,
  Loader2,
  RefreshCw,
  Clock,
  DollarSign,
  Plus,
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

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<CarrierItem | null>(null);
  const [deletingCarrier, setDeletingCarrier] = useState<CarrierItem | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState<number>(1);
  const [baseFee, setBaseFee] = useState<number>(25000);
  const [estimatedDelivery, setEstimatedDelivery] = useState("1-3 business days");
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState("");
  const [enabled, setEnabled] = useState(true);

  // ── 1. Fetch Carriers from DB ────────────────────────────────
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

  // ── 2. Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: {
      code: string;
      name: string;
      serviceType: number;
      baseFee: number;
      estimatedDelivery: string;
      trackingUrlTemplate: string;
      enabled: boolean;
    }) => {
      const res = await fetch("/api/admin/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create carrier");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-carriers"] });
      queryClient.invalidateQueries({ queryKey: ["shipping-carriers"] });
      toast.success(t("created"));
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || t("loadError"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      carrier: string;
      name?: string;
      enabled: boolean;
      baseFee: number;
      serviceType: number;
      estimatedDelivery?: string;
      trackingUrlTemplate?: string;
    }) => {
      const res = await fetch("/api/admin/carriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/admin/carriers?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete carrier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-carriers"] });
      queryClient.invalidateQueries({ queryKey: ["shipping-carriers"] });
      toast.success("Carrier deleted");
      setDeletingCarrier(null);
    },
    onError: () => {
      toast.error("Failed to delete carrier");
    },
  });

  const resetForm = () => {
    setCode("");
    setName("");
    setServiceTypeId(1);
    setBaseFee(25000);
    setEstimatedDelivery("1-3 business days");
    setTrackingUrlTemplate("");
    setEnabled(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: CarrierItem) => {
    setEditingCarrier(item);
    setCode(item.code);
    setName(item.name);
    setServiceTypeId(item.serviceTypeId);
    setBaseFee(item.baseFee);
    setEstimatedDelivery(item.estimatedDelivery);
    setTrackingUrlTemplate(item.trackingUrlTemplate);
    setEnabled(item.enabled);
  };

  const handleSaveAdd = () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Please enter a valid carrier code and name");
      return;
    }
    createMutation.mutate({
      code: code.trim(),
      name: name.trim(),
      serviceType: serviceTypeId,
      baseFee,
      estimatedDelivery: estimatedDelivery.trim(),
      trackingUrlTemplate: trackingUrlTemplate.trim(),
      enabled,
    });
  };

  const handleSaveEdit = () => {
    if (!editingCarrier || !name.trim()) return;
    updateMutation.mutate({
      carrier: editingCarrier.code,
      name: name.trim(),
      enabled,
      baseFee,
      serviceType: serviceTypeId,
      estimatedDelivery: estimatedDelivery.trim(),
      trackingUrlTemplate: trackingUrlTemplate.trim(),
    });
  };

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
  const instantCount = carriers.filter((c) => c.serviceTypeId === 2 && c.enabled).length;
  const apiConnectedCount = carriers.filter((c) => c.isApiConfigured).length;

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
            size="xs"
            onClick={handleOpenAdd}
            className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
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
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Instant / Express</span>
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
          <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
            <p>{t("empty")}</p>
            <Button
              size="xs"
              onClick={handleOpenAdd}
              className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("add")}
            </Button>
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
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        ({carrier.code})
                      </span>
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
                      {carrier.serviceTypeId === 2 && (
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
                        updateMutation.mutate({
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

                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setDeletingCarrier(carrier)}
                    className="h-8 text-xs rounded-none text-destructive hover:bg-destructive/10"
                    title="Delete carrier"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>

                  {carrier.code === "spx" && (
                    <Button
                      render={<Link href={`/${locale}/admin/settings/shipping`} />}
                      variant="ghost"
                      size="xs"
                      className="h-8 text-xs rounded-none text-muted-foreground hover:text-foreground"
                      title="SPX API Settings"
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

      {/* ── Add Carrier Modal ─────────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-none sm:max-w-md p-4 [&_[data-slot=dialog-close]]:rounded-none border-border">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              {t("add")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new courier shipping partner to your database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3 text-xs">
            <div className="grid gap-1.5">
              <Label htmlFor="add-code" className="text-xs uppercase tracking-widest font-bold">
                Carrier Code (unique identifier)
              </Label>
              <Input
                id="add-code"
                placeholder="e.g. jnt, grab, lalamove, spx, vtp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-9 text-xs rounded-none"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-name" className="text-xs uppercase tracking-widest font-bold">
                {t("name")}
              </Label>
              <Input
                id="add-name"
                placeholder="e.g. J&T Express, GrabExpress 2H"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs rounded-none"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-baseFee" className="text-xs uppercase tracking-widest font-bold">
                {t("baseFee")} (VND)
              </Label>
              <Input
                id="add-baseFee"
                type="number"
                min="0"
                step="1000"
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value) || 0)}
                className="h-9 text-xs rounded-none"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-sla" className="text-xs uppercase tracking-widest font-bold">
                {t("estimatedDelivery")}
              </Label>
              <Input
                id="add-sla"
                placeholder="e.g. 1 - 2 business days"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                className="h-9 text-xs rounded-none"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-serviceType" className="text-xs uppercase tracking-widest font-bold">
                Service Mode
              </Label>
              <select
                id="add-serviceType"
                value={serviceTypeId}
                onChange={(e) => setServiceTypeId(Number(e.target.value))}
                className="h-9 border border-border bg-background px-3 text-xs rounded-none w-full"
              >
                <option value={1}>Standard Service (Standard / Nhanh)</option>
                <option value={2}>Express / Instant Service (Hỏa Tốc 2H)</option>
                <option value={3}>Economy Service (Tiết Kiệm)</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-tracking" className="text-xs uppercase tracking-widest font-bold">
                {t("trackingUrl")}
              </Label>
              <Input
                id="add-tracking"
                placeholder="e.g. https://jtexpress.vn/track?billcode={trackingNumber}"
                value={trackingUrlTemplate}
                onChange={(e) => setTrackingUrlTemplate(e.target.value)}
                className="h-9 text-xs rounded-none"
              />
            </div>

            <div className="flex items-center justify-between border p-2.5 bg-muted/20 mt-1">
              <Label htmlFor="add-enabled" className="text-xs font-bold uppercase tracking-wider">
                Enable for Checkout
              </Label>
              <Switch
                id="add-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsAddOpen(false)}
              className="h-8 rounded-none text-xs"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={handleSaveAdd}
              disabled={createMutation.isPending}
              className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
            >
              {createMutation.isPending ? (
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

      {/* ── Edit Carrier Settings Dialog Modal ──────────────────────── */}
      <Dialog open={editingCarrier !== null} onOpenChange={(open) => !open && setEditingCarrier(null)}>
        <DialogContent className="rounded-none sm:max-w-md p-4 [&_[data-slot=dialog-close]]:rounded-none border-border">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {t("edit")}: {editingCarrier?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure rate, SLA, tracking URL, and activation status.
            </DialogDescription>
          </DialogHeader>

          {editingCarrier && (
            <div className="grid gap-3 py-3 text-xs">
              <div className="flex items-center justify-between border p-2.5 bg-muted/20">
                <Label htmlFor="edit-enabled-switch" className="text-xs font-bold uppercase tracking-wider">
                  Enable for Checkout
                </Label>
                <Switch
                  id="edit-enabled-switch"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-name" className="text-xs uppercase tracking-widest font-bold">
                  {t("name")}
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs rounded-none"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-baseFee" className="text-xs uppercase tracking-widest font-bold">
                  {t("baseFee")} (VND)
                </Label>
                <Input
                  id="edit-baseFee"
                  type="number"
                  min="0"
                  step="1000"
                  value={baseFee}
                  onChange={(e) => setBaseFee(Number(e.target.value) || 0)}
                  className="h-9 text-xs rounded-none"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-sla" className="text-xs uppercase tracking-widest font-bold">
                  {t("estimatedDelivery")}
                </Label>
                <Input
                  id="edit-sla"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="h-9 text-xs rounded-none"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-serviceType" className="text-xs uppercase tracking-widest font-bold">
                  Service Mode
                </Label>
                <select
                  id="edit-serviceType"
                  value={serviceTypeId}
                  onChange={(e) => setServiceTypeId(Number(e.target.value))}
                  className="h-9 border border-border bg-background px-3 text-xs rounded-none w-full"
                >
                  <option value={1}>Standard Service (Standard / Nhanh)</option>
                  <option value={2}>Express / Instant Service (Hỏa Tốc 2H)</option>
                  <option value={3}>Economy Service (Tiết Kiệm)</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-tracking" className="text-xs uppercase tracking-widest font-bold">
                  {t("trackingUrl")}
                </Label>
                <Input
                  id="edit-tracking"
                  value={trackingUrlTemplate}
                  onChange={(e) => setTrackingUrlTemplate(e.target.value)}
                  className="h-9 text-xs rounded-none"
                />
              </div>
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
              disabled={updateMutation.isPending}
              className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
            >
              {updateMutation.isPending ? (
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

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deletingCarrier !== null} onOpenChange={(open) => !open && setDeletingCarrier(null)}>
        <DialogContent className="rounded-none sm:max-w-sm p-4 [&_[data-slot=dialog-close]]:rounded-none border-border">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xs uppercase tracking-wider font-bold text-destructive">
              Delete Carrier: {deletingCarrier?.name}?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this carrier from your store database? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setDeletingCarrier(null)}
              className="h-8 rounded-none text-xs"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={() => deletingCarrier && deleteMutation.mutate(deletingCarrier.code)}
              disabled={deleteMutation.isPending}
              className="h-8 rounded-none text-xs uppercase tracking-wider font-bold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
