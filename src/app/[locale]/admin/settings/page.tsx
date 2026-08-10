"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe2, Loader2, PackageCheck, Plus, Save, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  tenantId: string; storeName: string; legalName: string | null; tagline: string | null;
  supportEmail: string | null; supportPhone: string | null; defaultLocale: "vi" | "en" | "th";
  currency: string; timezone: string; orderPrefix: string; fallbackShippingFee: number;
  lowStockThreshold: number; marketplaceShopId: string | null;
  marketplaceShops: { marketplace: "shopee" | "lazada" | "tiktok_shop"; shopId: string }[];
};

const emptySettings: Settings = {
  tenantId: "", storeName: "", legalName: "", tagline: "", supportEmail: "", supportPhone: "",
  defaultLocale: "vi", currency: "VND", timezone: "Asia/Ho_Chi_Minh", orderPrefix: "ORD",
  fallbackShippingFee: 30000, lowStockThreshold: 5, marketplaceShopId: null, marketplaceShops: [],
};

export default function AdminSettingsPage() {
  const params = useParams<{ locale: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings>(emptySettings);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery<{ settings: Settings }>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load settings");
      return result;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data?.settings) {
      const settings = query.data.settings;
      const marketplaceShops = settings.marketplaceShops?.length
        ? settings.marketplaceShops
        : settings.marketplaceShopId
          ? [{ marketplace: "shopee" as const, shopId: settings.marketplaceShopId }]
          : [];
      setForm({ ...settings, marketplaceShops });
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save settings");
      return result as { settings: Settings };
    },
    onSuccess: (result) => {
      setForm(result.settings);
      setError(null);
      queryClient.setQueryData(["admin-settings"], result);
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Global settings saved");
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
      toast.error(mutationError.message);
    },
  });

  if (query.isLoading) return <SettingsSkeleton />;
  if (query.isError) return <div className="border border-destructive bg-destructive/5 p-4 text-sm text-destructive">{query.error.message}</div>;

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Global settings</h1><p className="text-xs text-muted-foreground">Tenant-wide configuration used by the storefront, checkout and operations.</p></div>
        <Button type="submit" disabled={save.isPending} className="h-9 rounded-none px-5 text-xs uppercase tracking-wider">
          {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : <><Save className="mr-2 h-4 w-4" /> Save settings</>}
        </Button>
      </div>

      <SettingsSection icon={Building2} title="Store identity" description="Public names and support contacts shown throughout the application.">
        <Field label="Store name"><Input required value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} /></Field>
        <Field label="Legal name"><Input value={form.legalName || ""} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></Field>
        <Field label="Support email"><Input type="email" value={form.supportEmail || ""} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} /></Field>
        <Field label="Support phone"><Input value={form.supportPhone || ""} onChange={(event) => setForm({ ...form, supportPhone: event.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Tagline"><Input value={form.tagline || ""} onChange={(event) => setForm({ ...form, tagline: event.target.value })} /></Field></div>
      </SettingsSection>

      <SettingsSection icon={Globe2} title="Regional settings" description="Formatting defaults for this tenant.">
        <Field label="Default locale"><Select value={form.defaultLocale} onChange={(value) => setForm({ ...form, defaultLocale: value as Settings["defaultLocale"] })}><option value="vi">Vietnamese</option><option value="en">English</option><option value="th">Thai</option></Select></Field>
        <Field label="Currency"><Input maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></Field>
        <Field label="Timezone"><Select value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })}><option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh</option><option value="Asia/Bangkok">Asia/Bangkok</option><option value="UTC">UTC</option></Select></Field>
        <Field label="Tenant ID"><Input value={form.tenantId} disabled /><span className="text-[10px] font-normal text-muted-foreground">Resolved server-side; becomes the SaaS tenant key.</span></Field>
      </SettingsSection>

      <SettingsSection icon={PackageCheck} title="Orders and inventory" description="Operational defaults used by order numbering and inventory alerts.">
        <Field label="Order prefix"><Input required value={form.orderPrefix} onChange={(event) => setForm({ ...form, orderPrefix: event.target.value.toUpperCase() })} /></Field>
        <Field label="Low-stock threshold"><Input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: Number(event.target.value) })} /></Field>
      </SettingsSection>

      <SettingsSection icon={Store} title="Marketplace" description="Connection identifiers used by marketplace migration and synchronization tools.">
        <div className="grid gap-3 md:col-span-2">
          {form.marketplaceShops.length === 0 && <div className="border border-dashed p-5 text-center text-xs text-muted-foreground">No marketplace shops connected yet.</div>}
          {form.marketplaceShops.map((shop, index) => (
            <div key={`${shop.marketplace}-${index}`} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_44px] gap-2">
              <Select value={shop.marketplace} onChange={(marketplace) => setForm({ ...form, marketplaceShops: form.marketplaceShops.map((item, itemIndex) => itemIndex === index ? { ...item, marketplace: marketplace as Settings["marketplaceShops"][number]["marketplace"] } : item) })}>
                <option value="shopee">Shopee</option><option value="lazada">Lazada</option><option value="tiktok_shop">TikTok Shop</option>
              </Select>
              <Input required aria-label={`${shop.marketplace} Shop ID`} value={shop.shopId} onChange={(event) => setForm({ ...form, marketplaceShops: form.marketplaceShops.map((item, itemIndex) => itemIndex === index ? { ...item, shopId: event.target.value } : item) })} placeholder="Shop ID" />
              <Button type="button" variant="outline" aria-label="Remove marketplace shop" className="h-12 rounded-none px-0 text-muted-foreground hover:text-destructive" onClick={() => setForm({ ...form, marketplaceShops: form.marketplaceShops.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div><Button type="button" variant="outline" className="h-10 rounded-none text-xs" onClick={() => setForm({ ...form, marketplaceShops: [...form.marketplaceShops, { marketplace: "shopee", shopId: "" }] })}><Plus className="mr-2 h-4 w-4" />Add marketplace shop</Button></div>
          <span className="text-[10px] text-muted-foreground">The first Shopee entry is used as the default in product migration.</span>
        </div>
      </SettingsSection>

      <SettingsSection icon={Truck} title="Shipping" description="Safe operational defaults. Carrier credentials remain environment secrets.">
        <Field label="Fallback shipping fee"><Input type="number" min="0" value={form.fallbackShippingFee} onChange={(event) => setForm({ ...form, fallbackShippingFee: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Used only when the carrier cannot return a quote.</span></Field>
        <div className="flex items-end"><Button render={<Link href={`/${params.locale}/admin/settings/shipping`} />} variant="outline" className="h-12 w-full rounded-none">Configure carrier defaults</Button></div>
      </SettingsSection>

      {error && <p className="border border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={save.isPending} className="h-10 rounded-none px-6 text-xs uppercase tracking-wider">{save.isPending ? "Saving…" : "Save settings"}</Button></div>
    </form>
  );
}

function SettingsSection({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return <section className="border bg-card"><div className="flex gap-3 border-b bg-muted/20 p-4"><Icon className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider">{label}{children}</label>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 border border-input bg-background px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-ring">{children}</select>; }
function SettingsSkeleton() { return <div className="grid animate-pulse gap-5"><div className="h-9 w-52 bg-muted" />{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 border bg-muted/30" />)}</div>; }
