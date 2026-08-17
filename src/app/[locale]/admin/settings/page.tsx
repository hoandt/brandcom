"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, BellRing, Building2, ChevronRight, Globe2, Loader2, PackageCheck, Plus, Save, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  tenantId: string; storeName: string; legalName: string | null; tagline: string | null;
  seoTitle: string | null; seoDescription: string | null;
  supportEmail: string | null; supportPhone: string | null; defaultLocale: "vi" | "en" | "th";
  currency: string; timezone: string; orderPrefix: string; fallbackShippingFee: number;
  lowStockThreshold: number; productCacheSeconds: number; collectionCacheSeconds: number;
  categoryCacheSeconds: number; storeSettingsCacheSeconds: number;
  nonCodDiscountEnabled: boolean; nonCodDiscountType: "percentage" | "fixed_amount";
  nonCodDiscountValue: number; marketplaceShopId: string | null;
  marketplaceShops: { marketplace: "shopee" | "lazada" | "tiktok_shop"; shopId: string }[];
  orderNotificationEnabled: boolean; orderNotificationEmail: string | null;
  orderNotificationEmails: string[];
};

const emptySettings: Settings = {
  tenantId: "", storeName: "", legalName: "", tagline: "", seoTitle: "", seoDescription: "", supportEmail: "", supportPhone: "",
  defaultLocale: "vi", currency: "VND", timezone: "Asia/Ho_Chi_Minh", orderPrefix: "ORD",
  fallbackShippingFee: 30000, lowStockThreshold: 5, nonCodDiscountEnabled: true, nonCodDiscountType: "percentage",
  productCacheSeconds: 900, collectionCacheSeconds: 300, categoryCacheSeconds: 300, storeSettingsCacheSeconds: 300,
  nonCodDiscountValue: 5, marketplaceShopId: null, marketplaceShops: [],
  orderNotificationEnabled: true, orderNotificationEmail: null,
  orderNotificationEmails: [],
};

const settingsSections = [
  { id: "identity", label: "Store identity", icon: Building2 },
  { id: "cache", label: "Storefront cache", icon: Globe2 },
  { id: "regional", label: "Regional", icon: Globe2 },
  { id: "orders", label: "Orders & inventory", icon: PackageCheck },
  { id: "payment-discount", label: "Payment discount", icon: Banknote },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "shipping", label: "Shipping", icon: Truck },
];

export default function AdminSettingsPage() {
  const params = useParams<{ locale: string }>();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings>(emptySettings);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(settingsSections[0].id);
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

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65%", threshold: [0, 0.25, 0.5] });
    settingsSections.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [query.isSuccess]);

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
    <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Global settings</h1><p className="text-xs text-muted-foreground">Tenant-wide configuration used by the storefront, checkout and operations.</p></div>
        <Button type="submit" disabled={save.isPending} className="h-9 rounded-none px-5 text-xs uppercase tracking-wider">
          {save.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : <><Save className="mr-2 h-4 w-4" /> Save settings</>}
        </Button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="sticky top-20 z-20 -mx-1 flex gap-1 overflow-x-auto border-y bg-background/95 p-1 backdrop-blur lg:mx-0 lg:grid lg:overflow-visible lg:border [&::-webkit-scrollbar]:hidden" aria-label="Settings sections">
          {settingsSections.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setActiveSection(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`flex h-10 shrink-0 items-center gap-2 px-3 text-left text-[11px] font-semibold transition-colors lg:w-full ${activeSection === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-3.5 w-3.5" /><span>{label}</span><ChevronRight className="ml-auto hidden h-3.5 w-3.5 lg:block" /></button>)}
        </nav>

        <div className="grid min-w-0 gap-5">
      <SettingsSection id="identity" icon={Building2} title="Store identity" description="Public names and support contacts shown throughout the application.">
        <Field label="Store name"><Input required value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} /></Field>
        <Field label="Legal name"><Input value={form.legalName || ""} onChange={(event) => setForm({ ...form, legalName: event.target.value })} /></Field>
        <Field label="Support email"><Input type="email" value={form.supportEmail || ""} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} /></Field>
        <Field label="Support phone"><Input value={form.supportPhone || ""} onChange={(event) => setForm({ ...form, supportPhone: event.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Tagline"><Input value={form.tagline || ""} onChange={(event) => setForm({ ...form, tagline: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="SEO Meta Title"><Input value={form.seoTitle || ""} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} placeholder="Optimized title for search engines" /></Field></div>
        <div className="md:col-span-2"><Field label="SEO Meta Description"><Input value={form.seoDescription || ""} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} placeholder="Optimized description for search engines" /></Field></div>
      </SettingsSection>

      <SettingsSection id="cache" icon={Globe2} title="Storefront cache" description="Public storefront cache lifetimes in seconds. Use 0 to disable a cache. Checkout and signed-in areas are never cached.">
        <Field label="Product content"><Input type="number" min="0" max="86400" value={form.productCacheSeconds} onChange={(event) => setForm({ ...form, productCacheSeconds: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Recommended: 900 seconds</span></Field>
        <Field label="Collections"><Input type="number" min="0" max="86400" value={form.collectionCacheSeconds} onChange={(event) => setForm({ ...form, collectionCacheSeconds: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Recommended: 300 seconds</span></Field>
        <Field label="Categories"><Input type="number" min="0" max="86400" value={form.categoryCacheSeconds} onChange={(event) => setForm({ ...form, categoryCacheSeconds: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Recommended: 300 seconds</span></Field>
        <Field label="Store settings"><Input type="number" min="0" max="86400" value={form.storeSettingsCacheSeconds} onChange={(event) => setForm({ ...form, storeSettingsCacheSeconds: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Recommended: 300 seconds</span></Field>
      </SettingsSection>

      <SettingsSection id="regional" icon={Globe2} title="Regional settings" description="Formatting defaults for this tenant.">
        <Field label="Default locale"><Select value={form.defaultLocale} onChange={(value) => setForm({ ...form, defaultLocale: value as Settings["defaultLocale"] })}><option value="vi">Vietnamese</option><option value="en">English</option><option value="th">Thai</option></Select></Field>
        <Field label="Currency"><Input maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></Field>
        <Field label="Timezone"><Select value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })}><option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh</option><option value="Asia/Bangkok">Asia/Bangkok</option><option value="UTC">UTC</option></Select></Field>
        <Field label="Tenant ID"><Input value={form.tenantId} disabled /><span className="text-[10px] font-normal text-muted-foreground">Resolved server-side; becomes the SaaS tenant key.</span></Field>
      </SettingsSection>

      <SettingsSection id="orders" icon={PackageCheck} title="Orders and inventory" description="Operational defaults used by order numbering and inventory alerts.">
        <Field label="Order prefix"><Input required value={form.orderPrefix} onChange={(event) => setForm({ ...form, orderPrefix: event.target.value.toUpperCase() })} /></Field>
        <Field label="Low-stock threshold"><Input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: Number(event.target.value) })} /></Field>
      </SettingsSection>

      <SettingsSection id="payment-discount" icon={Banknote} title="Online payment discount (Discourage COD)" description="Offer an automatic discount when customers choose QR payment / VNPAY instead of Cash on Delivery.">
        <div className="flex min-h-12 items-center justify-between gap-4 border px-4 py-3 md:col-span-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Enable Non-COD Discount</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Automatically apply a discount when customers pay online (QR Payment / VietQR / VNPAY) instead of COD.</p>
          </div>
          <input
            type="checkbox"
            checked={form.nonCodDiscountEnabled}
            onChange={(event) => setForm({ ...form, nonCodDiscountEnabled: event.target.checked })}
            className="h-5 w-5 accent-primary"
          />
        </div>
        <Field label="Discount type">
          <Select
            value={form.nonCodDiscountType}
            onChange={(value) => setForm({ ...form, nonCodDiscountType: value as Settings["nonCodDiscountType"] })}
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed_amount">Fixed Amount (VND)</option>
          </Select>
        </Field>
        <Field label={form.nonCodDiscountType === "percentage" ? "Discount value (%)" : "Discount value (VND)"}>
          <Input
            type="number"
            min="0"
            step={form.nonCodDiscountType === "percentage" ? "0.5" : "1000"}
            value={form.nonCodDiscountValue}
            onChange={(event) => setForm({ ...form, nonCodDiscountValue: Number(event.target.value) })}
          />
        </Field>
      </SettingsSection>

      <SettingsSection id="notifications" icon={BellRing} title="Admin notifications" description="Internal alerts for store administrators. Customer notifications will be handled separately through Zalo later.">
        <div className="flex min-h-12 items-center justify-between gap-4 border px-4 py-3">
          <div><p className="text-xs font-bold uppercase tracking-wider">New-order email</p><p className="mt-1 text-[10px] text-muted-foreground">Send an email only to the admin recipient after an order is created.</p></div>
          <input type="checkbox" checked={form.orderNotificationEnabled} onChange={(event) => setForm({ ...form, orderNotificationEnabled: event.target.checked })} aria-label="Enable new-order admin email" className="h-5 w-5 accent-primary" />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider">Admin recipient emails</p><Button type="button" variant="outline" disabled={!form.orderNotificationEnabled || form.orderNotificationEmails.length >= 20} onClick={() => setForm({ ...form, orderNotificationEmails: [...form.orderNotificationEmails, ""] })} className="h-8 rounded-none px-3 text-[10px]"><Plus className="mr-1.5 h-3.5 w-3.5" />Add email</Button></div>
          {form.orderNotificationEmails.length === 0 && <div className="border border-dashed p-4 text-center text-xs text-muted-foreground">No admin recipients configured.</div>}
          {form.orderNotificationEmails.map((email, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_44px] gap-2"><Input type="email" required={form.orderNotificationEnabled} disabled={!form.orderNotificationEnabled} value={email} onChange={(event) => setForm({ ...form, orderNotificationEmails: form.orderNotificationEmails.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder="orders@example.com" /><Button type="button" variant="outline" disabled={!form.orderNotificationEnabled} aria-label={`Remove recipient ${email || index + 1}`} onClick={() => setForm({ ...form, orderNotificationEmails: form.orderNotificationEmails.filter((_, itemIndex) => itemIndex !== index) })} className="h-12 rounded-none px-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div>)}
          <span className="text-[10px] text-muted-foreground">Every configured admin receives the same order alert. SMTP credentials remain server-side.</span>
        </div>
      </SettingsSection>

      <SettingsSection id="marketplace" icon={Store} title="Marketplace" description="Connection identifiers used by marketplace migration and synchronization tools.">
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

      <SettingsSection id="shipping" icon={Truck} title="Shipping" description="Safe operational defaults. Carrier credentials remain environment secrets.">
        <Field label="Fallback shipping fee"><Input type="number" min="0" value={form.fallbackShippingFee} onChange={(event) => setForm({ ...form, fallbackShippingFee: Number(event.target.value) })} /><span className="text-[10px] font-normal text-muted-foreground">Used only when the carrier cannot return a quote.</span></Field>
        <div className="flex items-end"><Button render={<Link href={`/${params.locale}/admin/settings/shipping`} />} variant="outline" className="h-12 w-full rounded-none">Configure carrier defaults</Button></div>
      </SettingsSection>

      {error && <p className="border border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={save.isPending} className="h-10 rounded-none px-6 text-xs uppercase tracking-wider">{save.isPending ? "Saving…" : "Save settings"}</Button></div>
        </div>
      </div>
    </form>
  );
}

function SettingsSection({ id, icon: Icon, title, description, children }: { id: string; icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-36 border bg-card lg:scroll-mt-20"><div className="flex gap-3 border-b bg-muted/20 p-4"><Icon className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider">{label}{children}</label>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 border border-input bg-background px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-ring">{children}</select>; }
function SettingsSkeleton() { return <div className="grid animate-pulse gap-5"><div className="h-9 w-52 bg-muted" />{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 border bg-muted/30" />)}</div>; }
