"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderTree, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { ProductInventoryDialog } from "@/components/admin/product-inventory-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  images: { url: string }[];
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    stock: number;
    inventories: { quantity: number; warehouse: { id: string; name: string; code: string; isDefault: boolean; isActive: boolean } }[];
  }[];
};

export default function AdminProductsPage() {
  const t = useTranslations("AdminProducts");
  const categoryT = useTranslations("AdminCategories");
  const locale = useLocale();
  const [categoryId, setCategoryId] = useState("");
  const query = useQuery<{ products: Product[] }>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const response = await fetch("/api/admin/products");
      if (!response.ok) throw new Error(t("loadError"));
      return response.json();
    },
  });
  const products = useMemo(() => query.data?.products ?? [], [query.data]);
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    products.forEach((product) => product.categories.forEach((category) => map.set(category.id, category)));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);
  const visible = categoryId ? products.filter((product) => product.categories.some((category) => category.id === categoryId)) : products;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1><p className="text-xs text-muted-foreground">{t("subtitle")}</p></div>
        <div className="flex gap-2">
          <Button render={<Link href={`/${locale}/admin/categories`} />} variant="outline" className="h-9 rounded-none px-4 text-xs font-bold uppercase tracking-wider"><FolderTree className="mr-2 h-3.5 w-3.5" />{categoryT("manage")}</Button>
          <Button render={<Link href={`/${locale}/admin/products/new`} />} className="h-9 rounded-none px-4 text-xs font-bold uppercase tracking-wider"><Plus className="mr-2 h-3.5 w-3.5" />{t("add")}</Button>
        </div>
      </header>
      <div className="border bg-card">
        <div className="flex justify-end border-b p-3">
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-9 min-w-52 rounded-none border bg-background px-3 text-xs">
            <option value="">{t("allCategories")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <Table>
          <TableHeader className="bg-muted/40"><TableRow>
            <TableHead className="w-14 text-xs font-bold uppercase tracking-wider">{t("image")}</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">{t("name")}</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">{t("categories")}</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">{t("status")}</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">{t("inventory")}</TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-wider">{t("actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {query.isLoading && Array.from({ length: 4 }).map((_, index) => <TableRow key={index}><TableCell colSpan={6}><div className="h-10 animate-pulse bg-muted/60" /></TableCell></TableRow>)}
            {query.isError && <TableRow><TableCell colSpan={6} className="py-10 text-center text-xs text-destructive">{t("loadError")}</TableCell></TableRow>}
            {!query.isLoading && !query.isError && visible.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-xs text-muted-foreground">{t("empty")}</TableCell></TableRow>}
            {visible.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/10">
                <TableCell className="py-2">{product.images[0] ? <Image src={product.images[0].url} alt={product.name} width={40} height={40} unoptimized className="h-10 w-10 border object-cover" /> : <div className="flex h-10 w-10 items-center justify-center border bg-muted text-[9px] uppercase text-muted-foreground">{t("none")}</div>}</TableCell>
                <TableCell className="py-2 text-xs font-bold"><Link href={`/${locale}/admin/products/${product.id}/edit`} className="hover:text-primary hover:underline">{product.name}</Link><p className="mt-0.5 font-mono text-[10px] font-normal text-muted-foreground">{product.slug}</p></TableCell>
                <TableCell className="py-2"><div className="flex max-w-xs flex-wrap gap-1">{product.categories.length ? product.categories.map((category) => <span key={category.id} className="border bg-muted/30 px-1.5 py-0.5 text-[10px]">{category.name}</span>) : <span className="text-[10px] text-muted-foreground">{t("none")}</span>}</div></TableCell>
                <TableCell className="py-2"><span className={`border px-2 py-0.5 text-[9px] font-bold uppercase ${product.status === "ACTIVE" ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{product.status}</span></TableCell>
                <TableCell className="py-2"><ProductInventoryDialog productName={product.name} variants={product.variants} /></TableCell>
                <TableCell className="py-2 text-right"><Button render={<Link href={`/${locale}/admin/products/${product.id}/edit`} />} variant="ghost" size="sm" className="h-7 rounded-none px-3 text-xs">{t("edit")}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
