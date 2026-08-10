"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, DatabaseZap, ListFilter, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { CategoryPicker } from "@/components/admin/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FlatValue = string | number | boolean | null;
type FlatRow = Record<string, FlatValue>;
type MappingKey = "productName" | "description" | "overview" | "materials" | "care" | "productImage" | "variantName" | "sku" | "price" | "comparePrice" | "stock" | "variantImage";
type Mappings = Record<MappingKey, string>;
type PreviewResponse = { rows: FlatRow[]; columns: string[]; hasModels: boolean; suggestedMappings: Mappings };
type ShopItem = { itemId: number; status: string; updateTime: number | null };
type MarketplaceShop = { marketplace: string; shopId: string };
type Marketplace = "shopee" | "lazada" | "tiktok_shop";
type AdminSettings = {
  tenantId: string; storeName: string; legalName: string | null; tagline: string | null;
  supportEmail: string | null; supportPhone: string | null; defaultLocale: "vi" | "en" | "th";
  currency: string; timezone: string; orderPrefix: string; fallbackShippingFee: number;
  lowStockThreshold: number; marketplaceShopId: string | null; marketplaceShops?: MarketplaceShop[];
};

const mappingFields: { key: MappingKey; label: string; group: string; hint: string }[] = [
  { key: "productName", label: "Product name", group: "Product", hint: "Falls back to Shopee item ID" },
  { key: "description", label: "Description", group: "Product", hint: "Optional" },
  { key: "overview", label: "Overview", group: "Product", hint: "Optional" },
  { key: "materials", label: "Materials", group: "Product", hint: "Optional" },
  { key: "care", label: "Care", group: "Product", hint: "Optional" },
  { key: "productImage", label: "Main image", group: "Product", hint: "HTTPS URL; placeholder if empty" },
  { key: "variantName", label: "Variant name", group: "Variant", hint: "Falls back to model ID" },
  { key: "sku", label: "SKU", group: "Variant", hint: "Generated when empty" },
  { key: "price", label: "Price", group: "Variant", hint: "Defaults to 0" },
  { key: "comparePrice", label: "Compare price", group: "Variant", hint: "Optional" },
  { key: "stock", label: "Stock", group: "Variant", hint: "Defaults to 0" },
  { key: "variantImage", label: "Variant image", group: "Variant", hint: "Optional HTTPS URL" },
];

function displayValue(row: FlatRow | undefined, column: string) {
  if (!row || !column) return "—";
  const value = row[column];
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function MappedImage({ value, label }: { value: string; label: string }) {
  if (!/^https?:\/\//i.test(value)) return <span className="text-[10px] text-muted-foreground">No image</span>;
  return (
    <a href={value} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="group flex w-fit items-center gap-2">
      <span role="img" aria-label={label} className="h-12 w-12 shrink-0 border bg-muted bg-cover bg-center transition-transform group-hover:scale-105" style={{ backgroundImage: `url(${JSON.stringify(value)})` }} />
      <span className="max-w-24 truncate text-[9px] text-muted-foreground underline-offset-2 group-hover:underline">View original</span>
    </a>
  );
}

function ImageMappingPicker({ columns, rows, value, onChange }: { columns: string[]; rows: FlatRow[]; value: string; onChange: (column: string) => void }) {
  const candidates = columns.filter((column) => /image|img|thumbnail/i.test(column)).map((column) => ({
    column,
    images: [...new Set(rows.map((row) => row[column]).filter((entry): entry is string => typeof entry === "string" && /^https?:\/\//i.test(entry)))].slice(0, 3),
  })).filter((candidate) => candidate.images.length > 0);

  return (
    <div className="grid min-w-0 gap-2">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-0 rounded-none border bg-background px-2 text-[11px] outline-none focus:border-primary">
        <option value="">Not mapped</option>
        {columns.map((column) => <option key={column} value={column}>{column}</option>)}
      </select>
      {candidates.length > 0 ? <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">{candidates.map((candidate) => {
        const selected = value === candidate.column;
        return <button key={candidate.column} type="button" onClick={() => onChange(candidate.column)} className={`min-w-0 border p-1.5 text-left transition-colors ${selected ? "border-primary bg-primary/[0.05] ring-1 ring-primary" : "hover:border-primary/50"}`}>
          <span className="flex h-14 overflow-hidden bg-muted">{candidate.images.map((image, index) => <span key={image} role="img" aria-label={`${candidate.column} sample ${index + 1}`} className="min-w-0 flex-1 border-r bg-cover bg-center last:border-r-0" style={{ backgroundImage: `url(${JSON.stringify(image)})` }} />)}</span>
          <span className={`mt-1.5 block truncate text-[9px] ${selected ? "font-bold text-primary" : "text-muted-foreground"}`}>{selected ? "Selected · " : ""}{candidate.column}</span>
        </button>;
      })}</div> : <p className="text-[9px] text-muted-foreground">No image columns detected in this response.</p>}
    </div>
  );
}

export default function ShopeeProductMigrationPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [shopId, setShopId] = useState("");
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [newMarketplace, setNewMarketplace] = useState<Marketplace>("shopee");
  const [newShopId, setNewShopId] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mappings, setMappings] = useState<Mappings | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");

  const warehousesQuery = useQuery<{ warehouses: { id: string; name: string; code: string; isDefault: boolean; isPickup: boolean }[] }>({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const response = await fetch("/api/admin/warehouses");
      if (!response.ok) throw new Error("Failed to load warehouses");
      return response.json();
    },
    staleTime: 30_000,
  });
  const settingsQuery = useQuery<{ settings: AdminSettings }>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to load marketplace settings");
      return response.json();
    },
    staleTime: 60_000,
  });
  useEffect(() => {
    const configuredShopId = settingsQuery.data?.settings.marketplaceShops?.find((shop) => shop.marketplace === "shopee")?.shopId
      ?? settingsQuery.data?.settings.marketplaceShopId;
    if (!shopId && configuredShopId) setShopId(configuredShopId);
  }, [settingsQuery.data, shopId]);
  const configuredShopeeShops = settingsQuery.data?.settings.marketplaceShops?.filter((shop) => shop.marketplace === "shopee") ?? [];
  const shopeeShops = configuredShopeeShops.length > 0
    ? configuredShopeeShops
    : settingsQuery.data?.settings.marketplaceShopId
      ? [{ marketplace: "shopee", shopId: settingsQuery.data.settings.marketplaceShopId }]
      : [];
  const addShopMutation = useMutation({
    mutationFn: async () => {
      const settings = settingsQuery.data?.settings;
      if (!settings) throw new Error("Settings are not loaded yet");
      if (!newShopId) throw new Error("Enter a Shop ID");
      if (settings.marketplaceShops?.some((shop) => shop.marketplace === newMarketplace && shop.shopId === newShopId)) throw new Error("This marketplace shop is already configured");
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          marketplaceShops: [...(settings.marketplaceShops ?? []), { marketplace: newMarketplace, shopId: newShopId }],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add Shopee shop");
      return result as { settings: AdminSettings };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["admin-settings"], result);
      if (newMarketplace === "shopee") setShopId(newShopId);
      setNewShopId("");
      setNewMarketplace("shopee");
      setIsAddingShop(false);
      toast.success("Marketplace shop added");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const warehouses = warehousesQuery.data?.warehouses.filter((warehouse) => warehouse.isPickup) ?? [];

  const previewMutation = useMutation({
    mutationFn: async (selectedItemId?: string) => {
      const response = await fetch("/api/admin/products/migrate/shopee/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, itemId: selectedItemId || itemId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to fetch Shopee product");
      return json as PreviewResponse;
    },
    onSuccess: (data) => {
      setPreview(data);
      setMappings(data.suggestedMappings);
    },
  });

  const itemsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/products/migrate/shopee/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to fetch Shopee items");
      return json as { items: ShopItem[]; pages: number; total: number; truncated: boolean };
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!mappings) throw new Error("Preview and map the source fields first");
      const response = await fetch("/api/admin/products/migrate/shopee/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: Number(itemId), shopId: Number(shopId), mappings, categoryIds, warehouseId: warehouseId || undefined, status }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to import Shopee product");
      return json as { product: { id: string; name: string; slug: string; status: string; _count: { variants: number; images: number } } };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const importedProduct = importMutation.data?.product;
  const visibleShopItems = (itemsMutation.data?.items ?? []).filter((item) => String(item.itemId).includes(itemSearch.trim()));
  const previewRow = preview?.rows[0];
  const previewImageValue = previewRow && mappings ? displayValue(previewRow, mappings.productImage || mappings.variantImage) : "";
  const previewImage = /^https?:\/\//i.test(previewImageValue) ? previewImageValue : "";
  const previewName = previewRow && mappings ? displayValue(previewRow, mappings.productName) : "";
  const previewPrice = previewRow && mappings ? displayValue(previewRow, mappings.price) : "";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex items-start gap-3">
        <Button variant="outline" size="icon-sm" className="shrink-0 rounded-none" render={<Link href={`/${locale}/admin/products`} />}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">Migrate product from Shopee</h1><p className="mt-1 text-xs text-muted-foreground">Fetch models, preview source rows, map columns, then import as one Auria product.</p></div>
      </header>

      <section className="border bg-card">
        <div className="border-b px-4 py-3"><h2 className="text-xs font-bold uppercase tracking-widest">1. Shopee source</h2></div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:items-end">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between"><Label htmlFor="shopId" className="text-[10px] font-bold uppercase tracking-wider">Shopee shop</Label><button type="button" onClick={() => setIsAddingShop((current) => !current)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"><Plus className="h-3 w-3" /> Add marketplace shop</button></div>
            {settingsQuery.isLoading ? <div className="h-10 animate-pulse bg-muted" /> : shopeeShops.length > 0 ? (
              <select id="shopId" value={shopId} onChange={(event) => { setShopId(event.target.value); setItemId(""); setPreview(null); setMappings(null); itemsMutation.reset(); }} className="h-10 rounded-none border bg-background px-3 text-xs outline-none focus:border-primary">
                {shopeeShops.map((shop) => <option key={shop.shopId} value={shop.shopId}>Shopee · {shop.shopId}</option>)}
              </select>
            ) : <div className="flex h-10 items-center border border-dashed px-3 text-xs text-muted-foreground">No Shopee shop configured</div>}
            {settingsQuery.isError && <p className="text-[10px] text-destructive">Unable to fetch configured shops.</p>}
          </div>
          <div className="grid gap-1.5"><Label htmlFor="itemId" className="text-[10px] font-bold uppercase tracking-wider">Item ID</Label><Input id="itemId" inputMode="numeric" value={itemId} onChange={(event) => setItemId(event.target.value.replace(/\D/g, ""))} placeholder="Select below or enter an ID" className="h-10 rounded-none" /></div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
            <Button type="button" variant="outline" disabled={!shopId || itemsMutation.isPending} onClick={() => itemsMutation.mutate()} className="h-10 flex-1 rounded-none px-5 text-xs font-bold uppercase tracking-wider sm:flex-none">{itemsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListFilter className="mr-2 h-4 w-4" />}Fetch all items</Button>
            <Button type="button" disabled={!shopId || !itemId || previewMutation.isPending} onClick={() => previewMutation.mutate(itemId)} className="h-10 flex-1 rounded-none px-5 text-xs font-bold uppercase tracking-wider sm:flex-none">{previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Preview selected</Button>
          </div>
        </div>
        {isAddingShop && (
          <div className="grid gap-2 border-t bg-muted/10 p-4 sm:grid-cols-[minmax(160px,0.6fr)_minmax(220px,1fr)_auto] sm:items-end">
            <div className="grid gap-1.5"><Label htmlFor="newMarketplace" className="text-[10px] font-bold uppercase tracking-wider">Marketplace</Label><select id="newMarketplace" value={newMarketplace} onChange={(event) => setNewMarketplace(event.target.value as Marketplace)} className="h-10 rounded-none border bg-background px-3 text-xs outline-none focus:border-primary"><option value="shopee">Shopee</option><option value="lazada">Lazada</option><option value="tiktok_shop">TikTok Shop</option></select></div>
            <div className="grid gap-1.5"><Label htmlFor="newShopId" className="text-[10px] font-bold uppercase tracking-wider">Shop ID</Label><Input id="newShopId" autoFocus inputMode="numeric" value={newShopId} onChange={(event) => setNewShopId(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addShopMutation.mutate(); } }} placeholder="e.g. 987654321" className="h-10 rounded-none" /></div>
            <div className="flex gap-2"><Button type="button" disabled={!newShopId || addShopMutation.isPending || settingsQuery.isLoading} onClick={() => addShopMutation.mutate()} className="h-10 flex-1 rounded-none px-5 text-xs font-bold uppercase sm:flex-none">{addShopMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save shop</Button><Button type="button" variant="outline" aria-label="Cancel adding shop" onClick={() => { setIsAddingShop(false); setNewShopId(""); setNewMarketplace("shopee"); }} className="h-10 rounded-none px-3"><X className="h-4 w-4" /></Button></div>
          </div>
        )}
        {itemsMutation.data && (
          <div className="border-t">
            {(previewMutation.isPending || preview) && itemId && (
              <div className="grid gap-3 border-b bg-primary/[0.025] p-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center">
                <div className="relative aspect-square overflow-hidden border bg-muted">
                  {previewMutation.isPending ? <div className="absolute inset-0 animate-pulse bg-muted" /> : previewImage ? <div role="img" aria-label={previewName || `Shopee item ${itemId}`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(previewImage)})` }} /> : <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">No image returned</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Selected preview</p>
                  {previewMutation.isPending ? <><div className="mt-2 h-4 w-2/3 animate-pulse bg-muted" /><div className="mt-2 h-3 w-1/3 animate-pulse bg-muted" /></> : <><h3 className="mt-1 truncate text-sm font-bold">{previewName === "—" ? `Shopee item ${itemId}` : previewName}</h3><p className="mt-1 text-xs text-muted-foreground">Item ID {itemId} · {preview?.rows.length ?? 0} variant{preview?.rows.length === 1 ? "" : "s"}</p>{previewPrice && previewPrice !== "—" && <p className="mt-2 text-sm font-bold text-primary">{previewPrice}</p>}</>}
                </div>
                {!previewMutation.isPending && <Button type="button" onClick={() => document.getElementById("mapping-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-9 rounded-none px-4 text-[10px] font-bold uppercase">Review mapping <ArrowRight className="ml-2 h-3.5 w-3.5" /></Button>}
              </div>
            )}
            <div className="flex flex-col gap-3 border-b bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-semibold">{itemsMutation.data.items.length} items fetched across {itemsMutation.data.pages} page{itemsMutation.data.pages === 1 ? "" : "s"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{itemsMutation.data.truncated ? "Result limited to 5,000 items." : `Shopee reported ${itemsMutation.data.total} items.`}</p></div>
              <label className="relative block sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={itemSearch} onChange={(event) => setItemSearch(event.target.value.replace(/\D/g, ""))} placeholder="Search item ID" className="h-9 rounded-none pl-9 text-xs" /></label>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {visibleShopItems.length === 0 ? <p className="px-4 py-8 text-center text-xs text-muted-foreground">No matching items.</p> : visibleShopItems.map((item) => {
                const selected = itemId === String(item.itemId);
                const isLoadingPreview = previewMutation.isPending && previewMutation.variables === String(item.itemId);
                return <button key={item.itemId} type="button" disabled={previewMutation.isPending} onClick={() => { const selectedId = String(item.itemId); setItemId(selectedId); setPreview(null); setMappings(null); previewMutation.mutate(selectedId); }} className={`grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/30 disabled:cursor-wait disabled:opacity-70 ${selected ? "bg-primary/[0.06]" : ""}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-primary" : "border-input"}`}>{isLoadingPreview ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : selected && <span className="h-2 w-2 rounded-full bg-primary" />}</span><span><span className="block font-mono text-xs font-semibold">{item.itemId}</span>{item.updateTime && <span className="mt-0.5 block text-[9px] text-muted-foreground">Updated {new Date(item.updateTime * 1000).toLocaleString()}</span>}</span><span className="border bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase">{item.status}</span></button>;
              })}
            </div>
          </div>
        )}
        {itemsMutation.isError && <p className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive">{itemsMutation.error.message}</p>}
        {previewMutation.isError && <p className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive">{previewMutation.error.message}</p>}
      </section>

      {preview && mappings && (
        <>
          <section id="mapping-section" className="scroll-mt-20 border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-xs font-bold uppercase tracking-widest">2. Map columns</h2><p className="mt-1 text-[10px] text-muted-foreground">{preview.columns.length} source columns · {preview.rows.length} model rows</p></div><span className="border bg-muted/30 px-2 py-1 text-[9px] font-bold uppercase">{preview.hasModels ? "Multi-variant" : "Single item"}</span></div>
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
              {["Product", "Variant"].map((group) => (
                <div key={group} className="divide-y">
                  <div className="bg-muted/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group} fields</div>
                  {mappingFields.filter((field) => field.group === group).map((field) => {
                    const isImageField = field.key === "productImage" || field.key === "variantImage";
                    const updateMapping = (column: string) => setMappings((current) => current ? { ...current, [field.key]: column } : current);
                    return <div key={field.key} className={`grid gap-2 px-4 py-3 sm:grid-cols-[130px_1fr] ${isImageField ? "sm:items-start" : "sm:items-center"}`}>
                      <span><span className="block text-xs font-semibold">{field.label}</span><span className="block text-[9px] text-muted-foreground">{field.hint}</span>{isImageField && <span className="mt-1 block text-[9px] text-primary">Select a thumbnail to map</span>}</span>
                      {isImageField ? <ImageMappingPicker columns={preview.columns} rows={preview.rows} value={mappings[field.key]} onChange={updateMapping} /> : <select value={mappings[field.key]} onChange={(event) => updateMapping(event.target.value)} className="h-9 min-w-0 rounded-none border bg-background px-2 text-[11px] outline-none focus:border-primary"><option value="">Not mapped</option>{preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select>}
                    </div>;
                  })}
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden border bg-card">
            <div className="border-b px-4 py-3"><h2 className="text-xs font-bold uppercase tracking-widest">3. Preview mapped rows</h2><p className="mt-1 text-[10px] text-muted-foreground">Review the values that will become Auria variants.</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-muted/30 text-[9px] uppercase tracking-wider"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Variant</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Compare</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Image</th></tr></thead>
                <tbody className="divide-y">{preview.rows.slice(0, 50).map((row, index) => { const imageValue = displayValue(row, mappings.variantImage || mappings.productImage); return <tr key={index}><td className="max-w-52 truncate px-3 py-2 font-semibold">{displayValue(row, mappings.productName)}</td><td className="max-w-44 truncate px-3 py-2">{displayValue(row, mappings.variantName)}</td><td className="max-w-48 truncate px-3 py-2 font-mono text-[10px]">{displayValue(row, mappings.sku)}</td><td className="px-3 py-2 tabular-nums">{displayValue(row, mappings.price)}</td><td className="px-3 py-2 tabular-nums text-muted-foreground">{displayValue(row, mappings.comparePrice)}</td><td className="px-3 py-2 tabular-nums">{displayValue(row, mappings.stock)}</td><td className="px-3 py-2"><MappedImage value={imageValue} label={`${displayValue(row, mappings.variantName)} image`} /></td></tr>; })}</tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 border bg-card p-4">
            <div><h2 className="text-xs font-bold uppercase tracking-widest">4. Import settings</h2><p className="mt-1 text-[10px] text-muted-foreground">Draft is recommended so content and images can be reviewed before publishing.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-wider">Initial status</Label><select id="status" value={status} onChange={(event) => setStatus(event.target.value as "DRAFT" | "ACTIVE")} className="h-10 rounded-none border bg-background px-3 text-xs"><option value="DRAFT">Draft — review first</option><option value="ACTIVE">Active — publish immediately</option></select></div>
              <div className="grid gap-1.5"><Label htmlFor="warehouse" className="text-[10px] font-bold uppercase tracking-wider">Inventory warehouse</Label><select id="warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={warehousesQuery.isLoading || warehousesQuery.isError} className="h-10 rounded-none border bg-background px-3 text-xs"><option value="">Default pickup warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.code}{warehouse.isDefault ? " · Default" : ""}</option>)}</select>{warehousesQuery.isError && <p className="text-[10px] text-destructive">Unable to load warehouses. Default warehouse will be used.</p>}</div>
            </div>
            <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} />
            {importMutation.isError && <p className="border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{importMutation.error.message}</p>}
            {importedProduct ? (
              <div className="flex flex-col gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">Imported {importedProduct.name}</p><p className="mt-1 text-xs">{importedProduct._count.variants} variants · {importedProduct._count.images} images · {importedProduct.status}</p></div><Button render={<Link href={`/${locale}/admin/products/${importedProduct.id}/edit`} />} className="h-9 rounded-none px-4 text-xs font-bold uppercase">Review product <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            ) : (
              <div className="flex justify-end"><Button type="button" onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="h-11 rounded-none px-6 text-xs font-bold uppercase tracking-wider">{importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}Import as {status.toLowerCase()}</Button></div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
