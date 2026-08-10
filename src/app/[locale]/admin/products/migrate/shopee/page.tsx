"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, DatabaseZap, Loader2, RefreshCw } from "lucide-react";
import { CategoryPicker } from "@/components/admin/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FlatValue = string | number | boolean | null;
type FlatRow = Record<string, FlatValue>;
type MappingKey = "productName" | "description" | "overview" | "materials" | "care" | "productImage" | "variantName" | "sku" | "price" | "comparePrice" | "stock" | "variantImage";
type Mappings = Record<MappingKey, string>;
type PreviewResponse = { rows: FlatRow[]; columns: string[]; hasModels: boolean; suggestedMappings: Mappings };

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

export default function ShopeeProductMigrationPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [shopId, setShopId] = useState("");
  const [itemId, setItemId] = useState("");
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
  const warehouses = warehousesQuery.data?.warehouses.filter((warehouse) => warehouse.isPickup) ?? [];

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/products/migrate/shopee/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, itemId }),
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

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <header className="flex items-start gap-3">
        <Button variant="outline" size="icon-sm" className="shrink-0 rounded-none" render={<Link href={`/${locale}/admin/products`} />}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">Migrate product from Shopee</h1><p className="mt-1 text-xs text-muted-foreground">Fetch models, preview source rows, map columns, then import as one Auria product.</p></div>
      </header>

      <section className="border bg-card">
        <div className="border-b px-4 py-3"><h2 className="text-xs font-bold uppercase tracking-widest">1. Shopee source</h2></div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5"><Label htmlFor="shopId" className="text-[10px] font-bold uppercase tracking-wider">Shop ID</Label><Input id="shopId" inputMode="numeric" value={shopId} onChange={(event) => setShopId(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 987654321" className="h-10 rounded-none" /></div>
          <div className="grid gap-1.5"><Label htmlFor="itemId" className="text-[10px] font-bold uppercase tracking-wider">Item ID</Label><Input id="itemId" inputMode="numeric" value={itemId} onChange={(event) => setItemId(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 123456789" className="h-10 rounded-none" /></div>
          <Button type="button" disabled={!shopId || !itemId || previewMutation.isPending} onClick={() => previewMutation.mutate()} className="h-10 rounded-none px-5 text-xs font-bold uppercase tracking-wider">{previewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Fetch preview</Button>
        </div>
        {previewMutation.isError && <p className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive">{previewMutation.error.message}</p>}
      </section>

      {preview && mappings && (
        <>
          <section className="border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-xs font-bold uppercase tracking-widest">2. Map columns</h2><p className="mt-1 text-[10px] text-muted-foreground">{preview.columns.length} source columns · {preview.rows.length} model rows</p></div><span className="border bg-muted/30 px-2 py-1 text-[9px] font-bold uppercase">{preview.hasModels ? "Multi-variant" : "Single item"}</span></div>
            <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
              {["Product", "Variant"].map((group) => (
                <div key={group} className="divide-y">
                  <div className="bg-muted/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group} fields</div>
                  {mappingFields.filter((field) => field.group === group).map((field) => (
                    <label key={field.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[130px_1fr] sm:items-center">
                      <span><span className="block text-xs font-semibold">{field.label}</span><span className="block text-[9px] text-muted-foreground">{field.hint}</span></span>
                      <select value={mappings[field.key]} onChange={(event) => setMappings((current) => current ? { ...current, [field.key]: event.target.value } : current)} className="h-9 min-w-0 rounded-none border bg-background px-2 text-[11px] outline-none focus:border-primary">
                        <option value="">Not mapped</option>
                        {preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden border bg-card">
            <div className="border-b px-4 py-3"><h2 className="text-xs font-bold uppercase tracking-widest">3. Preview mapped rows</h2><p className="mt-1 text-[10px] text-muted-foreground">Review the values that will become Auria variants.</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-muted/30 text-[9px] uppercase tracking-wider"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Variant</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Compare</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Image</th></tr></thead>
                <tbody className="divide-y">{preview.rows.slice(0, 50).map((row, index) => <tr key={index}><td className="max-w-52 truncate px-3 py-2 font-semibold">{displayValue(row, mappings.productName)}</td><td className="max-w-44 truncate px-3 py-2">{displayValue(row, mappings.variantName)}</td><td className="max-w-48 truncate px-3 py-2 font-mono text-[10px]">{displayValue(row, mappings.sku)}</td><td className="px-3 py-2 tabular-nums">{displayValue(row, mappings.price)}</td><td className="px-3 py-2 tabular-nums text-muted-foreground">{displayValue(row, mappings.comparePrice)}</td><td className="px-3 py-2 tabular-nums">{displayValue(row, mappings.stock)}</td><td className="max-w-48 truncate px-3 py-2 text-[10px] text-muted-foreground">{displayValue(row, mappings.variantImage || mappings.productImage)}</td></tr>)}</tbody>
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
