"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2, MapPin, Pencil, Plus, Search, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { AddressCascader, type Location } from "@/components/checkout/address-cascader";
import { OsmMap } from "@/components/checkout/osm-map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Warehouse = {
  id: string; name: string; code: string; contactName: string; phone: string; address: string;
  provinceId: string; provinceName: string; districtId: string; districtName: string;
  wardId: string; wardName: string; latitude: number | null; longitude: number | null;
  isDefault: boolean; isActive: boolean; isPickup: boolean; isReturn: boolean;
};

type FormState = {
  name: string; code: string; contactName: string; phone: string; address: string;
  location: { province?: Location; district?: Location; ward?: Location };
  latitude: number | null; longitude: number | null;
  isDefault: boolean; isActive: boolean; isPickup: boolean; isReturn: boolean;
};

const emptyForm: FormState = {
  name: "", code: "", contactName: "", phone: "", address: "", location: {},
  latitude: null, longitude: null,
  isDefault: false, isActive: true, isPickup: true, isReturn: true,
};

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pickup" | "return">("pickup");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isReversing, setIsReversing] = useState(false);

  const { data, isLoading } = useQuery<{ warehouses: Warehouse[] }>({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/admin/warehouses");
      if (!res.ok) throw new Error("Failed to load warehouses");
      return res.json();
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const province = form.location.province;
      const ward = form.location.ward;
      if (!province || !ward) throw new Error("Province and ward are required");
      const payload = {
        ...form, location: undefined,
        provinceId: province.location_id, provinceName: province.name,
        districtId: form.location.district?.location_id || String(ward.parent_id || ""),
        districtName: form.location.district?.name || "",
        wardId: ward.location_id, wardName: ward.name,
        latitude: form.latitude, longitude: form.longitude,
        spxMapping: Array.isArray(ward.shipping_mappings?.spx)
          ? ward.shipping_mappings.spx[0]
          : ward.shipping_mappings?.spx,
      };
      const res = await fetch(editingId ? `/api/admin/warehouses/${editingId}` : "/api/admin/warehouses", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save warehouse");
      return json;
    },
    onSuccess: () => {
      setFormError(null);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      setOpen(false);
      toast.success(editingId ? "Warehouse updated" : "Warehouse created");
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!open || form.latitude == null || form.longitude == null) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsReversing(true);
      try {
        const response = await fetch(
          `/api/locations/reverse?lat=${encodeURIComponent(form.latitude!)}&lng=${encodeURIComponent(form.longitude!)}`,
          { signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok || !result.success || !result.data?.province || !result.data?.ward) return;

        setForm((current) => ({
          ...current,
          location: {
            province: result.data.province as Location,
            district: result.data.district as Location | undefined,
            ward: result.data.ward as Location,
          },
        }));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Warehouse reverse lookup failed", error);
        }
      } finally {
        if (!controller.signal.aborted) setIsReversing(false);
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.latitude, form.longitude, open]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/warehouses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete warehouse");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] });
      toast.success("Warehouse deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const warehouses = useMemo(() => data?.warehouses ?? [], [data?.warehouses]);
  const filtered = useMemo(() => warehouses.filter((warehouse) => {
    const matchesTab = tab === "pickup" ? warehouse.isPickup : warehouse.isReturn;
    const query = search.trim().toLowerCase();
    return matchesTab && (!query || [warehouse.name, warehouse.code, warehouse.address, warehouse.wardName, warehouse.provinceName]
      .some((value) => value.toLowerCase().includes(query)));
  }), [warehouses, search, tab]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setFieldErrors({});
    setOpen(true);
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setFormError(null);
    setFieldErrors({});
    setForm({
      name: warehouse.name, code: warehouse.code, contactName: warehouse.contactName,
      phone: warehouse.phone, address: warehouse.address,
      location: {
        province: { location_id: warehouse.provinceId, name: warehouse.provinceName, level: 0 },
        district: warehouse.districtId ? { location_id: warehouse.districtId, name: warehouse.districtName, level: 1 } : undefined,
        ward: { location_id: warehouse.wardId, name: warehouse.wardName, level: 2 },
      },
      latitude: warehouse.latitude, longitude: warehouse.longitude,
      isDefault: warehouse.isDefault, isActive: warehouse.isActive,
      isPickup: warehouse.isPickup, isReturn: warehouse.isReturn,
    });
    setOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Warehouse name is required";
    if (!form.code.trim()) errors.code = "Warehouse code is required";
    if (!form.contactName.trim()) errors.contactName = "Contact name is required";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    if (!form.location.province) errors.location = "Province is required";
    else if (!form.location.ward) errors.location = "Ward is required";
    if (!form.address.trim()) errors.address = "Street address is required";
    if (form.latitude == null || form.longitude == null) errors.coordinates = "Pin the exact warehouse location on the map";
    return errors;
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-3 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage pickup and return locations used for shipping.</p>
      </div>

      <div className="flex gap-8 border-b">
        <button onClick={() => setTab("pickup")} className={`border-b-2 px-1 py-3 text-sm font-semibold ${tab === "pickup" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Pickup warehouses <span className="font-normal">{warehouses.filter((item) => item.isPickup).length}</span>
        </button>
        <button onClick={() => setTab("return")} className={`border-b-2 px-1 py-3 text-sm font-semibold ${tab === "return" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Return warehouses <span className="font-normal">{warehouses.filter((item) => item.isReturn).length}</span>
        </button>
      </div>

      <section className="rounded-none border bg-card p-4 md:p-6">
        <div className="mb-5 rounded-none bg-primary/5 p-4 text-sm text-muted-foreground">
          Set accurate warehouse locations so shipping fees and carrier availability can be calculated correctly.
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search warehouse name, code or address" className="pl-9" />
          </div>
          <Button className="rounded-none" onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Add warehouse</Button>
        </div>

        <div className="overflow-hidden rounded-none border">
          {isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading warehouses…</div> : filtered.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <WarehouseIcon className="mb-3 h-9 w-9 text-muted-foreground/40" />
              <p className="font-semibold">No warehouses found</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a warehouse to start configuring shipping origins.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((warehouse) => (
                <div key={warehouse.id} className="grid gap-4 p-4 hover:bg-muted/20 md:grid-cols-[1fr_2fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{warehouse.name}</span>
                      {warehouse.isDefault && <span className="rounded-none bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">Default</span>}
                      <span className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${warehouse.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{warehouse.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Warehouse ID: {warehouse.code}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p>{warehouse.address}</p>
                      <p className="text-muted-foreground">{[warehouse.wardName, warehouse.districtName, warehouse.provinceName].filter(Boolean).join(", ")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{warehouse.phone} · {warehouse.contactName}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 md:justify-end">
                    <Button className="rounded-none" variant="ghost" size="sm" onClick={() => startEdit(warehouse)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                    <Button className="rounded-none" variant="ghost" size="sm" disabled={warehouse.isDefault || remove.isPending} onClick={() => window.confirm(`Delete ${warehouse.name}?`) && remove.mutate(warehouse.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-none p-0 sm:max-w-5xl [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="shrink-0 border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{editingId ? "Edit warehouse" : "Add warehouse"}</DialogTitle>
            <DialogDescription>Enter the warehouse contact and exact pickup address.</DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const errors = validateForm();
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) {
                setFormError(`Please complete: ${Object.values(errors).join(", ")}`);
                return;
              }
              setFormError(null);
              save.mutate();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                <div className="order-2 grid content-start gap-4 lg:order-1">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <Field label="Warehouse name" error={fieldErrors.name}><Input className="placeholder:text-muted-foreground/35" aria-invalid={Boolean(fieldErrors.name)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" /></Field>
                    <Field label="Warehouse code" error={fieldErrors.code}><Input className="placeholder:text-muted-foreground/35" aria-invalid={Boolean(fieldErrors.code)} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WH-HCM-01" /></Field>
                    <Field label="Contact name" error={fieldErrors.contactName}><Input className="placeholder:text-muted-foreground/35" aria-invalid={Boolean(fieldErrors.contactName)} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Manager" /></Field>
                    <Field label="Phone" error={fieldErrors.phone}><Input className="placeholder:text-muted-foreground/35" aria-invalid={Boolean(fieldErrors.phone)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0900 000 000" /></Field>
                  </div>
                  <Field label="Province / Ward" error={fieldErrors.location}>
                    <div className={`rounded-none border px-3 ${fieldErrors.location ? "border-destructive" : ""}`}><AddressCascader square value={form.location} onChange={(location) => setForm({ ...form, location })} /></div>
                  </Field>
                  <Field label="Street address" error={fieldErrors.address}><Input className="placeholder:text-muted-foreground/35" aria-invalid={Boolean(fieldErrors.address)} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House number, street name" /></Field>
                  <div className="grid gap-2 rounded-none border p-3 sm:grid-cols-2">
                    <CheckField label="Active" checked={form.isActive} onChange={(isActive) => setForm({ ...form, isActive })} />
                    <CheckField label="Default warehouse" checked={form.isDefault} onChange={(isDefault) => setForm({ ...form, isDefault })} />
                    <CheckField label="Pickup location" checked={form.isPickup} onChange={(isPickup) => setForm({ ...form, isPickup })} />
                    <CheckField label="Return location" checked={form.isReturn} onChange={(isReturn) => setForm({ ...form, isReturn })} />
                  </div>
                </div>

                <div className="order-1 grid content-start gap-4 lg:order-2">
                  <Field label="Exact location for instant delivery" error={fieldErrors.coordinates}>
                    <div className="relative">
                      <OsmMap
                        squareControls
                        key={`${editingId || "new"}-${open}`}
                        initialLat={form.latitude ?? undefined}
                        initialLng={form.longitude ?? undefined}
                        onLocationChange={(latitude, longitude) =>
                          setForm((current) => ({ ...current, latitude, longitude }))
                        }
                        className={`relative h-[220px] w-full overflow-hidden rounded-none border sm:h-[280px] lg:h-[430px] ${fieldErrors.coordinates ? "border-destructive" : ""}`}
                      />
                      {isReversing && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-none bg-background/45 backdrop-blur-[1px]">
                          <div className="flex items-center gap-2 rounded-none bg-background px-4 py-2 text-xs font-medium shadow-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Updating address…
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      {isReversing
                        ? "Updating province and ward from map location…"
                        : form.latitude != null && form.longitude != null
                        ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                        : "Move the map pin or use your current location to capture coordinates."}
                    </span>
                  </Field>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t bg-background px-6 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
              {formError && (
                <p role="alert" className="mb-3 rounded-none bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-none border border-primary px-8 text-sm font-medium text-primary hover:bg-accent">Cancel</button>
              <button type="submit" disabled={save.isPending} className="h-12 rounded-none bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm hover:bg-[#8F1824] disabled:pointer-events-none disabled:opacity-50">
                {save.isPending ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Save warehouse"}
              </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <div className="grid min-w-0 gap-1.5 text-sm font-medium"><span>{label}</span>{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</div>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />{label}</label>;
}
