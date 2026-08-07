"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FolderTree, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildCategoryTree, flattenCategoryTree, getDescendantIds, type CategoryNodeInput } from "@/lib/categories";

type Category = CategoryNodeInput & {
  description: string | null;
  heroImageUrl: string | null;
  _count: { products: number; children: number };
};

type FormState = { name: string; slug: string; description: string; heroImageUrl: string; parentId: string; position: number; isActive: boolean };
const emptyForm: FormState = { name: "", slug: "", description: "", heroImageUrl: "", parentId: "", position: 0, isActive: true };

async function readResponse(response: Response) {
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Request failed");
  return json;
}

export default function AdminCategoriesPage() {
  const t = useTranslations("AdminCategories");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  const query = useQuery<{ categories: Category[] }>({
    queryKey: ["admin-categories"],
    queryFn: async () => readResponse(await fetch("/api/admin/categories")),
  });
  const categories = useMemo(() => query.data?.categories ?? [], [query.data]);
  const flattened = useMemo(() => flattenCategoryTree(buildCategoryTree(categories)), [categories]);
  const visible = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return value ? flattened.filter((category) => category.path.toLocaleLowerCase().includes(value)) : flattened;
  }, [flattened, search]);

  const save = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.set("name", form.name);
      body.set("slug", form.slug);
      body.set("description", form.description);
      body.set("heroImageUrl", form.heroImageUrl);
      body.set("parentId", form.parentId);
      body.set("position", String(form.position));
      body.set("isActive", String(form.isActive));
      if (heroFile) body.set("heroImage", heroFile);
      return readResponse(await fetch(editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        body,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(editingId ? t("updated") : t("created"));
      setOpen(false);
    },
    onError: (error: Error) => setFormError(error.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => readResponse(await fetch(`/api/admin/categories/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(t("deleted"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setHeroFile(null);
    setFormError(null);
    setOpen(true);
  };
  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      heroImageUrl: category.heroImageUrl ?? "",
      parentId: category.parentId ?? "",
      position: category.position,
      isActive: category.isActive,
    });
    setHeroFile(null);
    setFormError(null);
    setOpen(true);
  };
  const excludedParentIds = new Set(editingId ? [editingId, ...getDescendantIds(categories, editingId)] : []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={startCreate} className="h-9 rounded-none px-4 text-xs font-bold uppercase tracking-wider"><Plus className="mr-2 h-4 w-4" />{t("add")}</Button>
      </header>

      <section className="border bg-card">
        <div className="border-b p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} className="h-9 rounded-none pl-9 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_90px_110px_90px] border-b bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>{t("name")}</span><span>{t("products")}</span><span>{t("active")}</span><span className="text-right">{t("actions")}</span>
        </div>
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div>
        ) : query.isError ? (
          <div className="p-12 text-center text-xs text-destructive">{t("loadError")}</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center"><FolderTree className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">{t("empty")}</p><p className="mt-1 text-xs text-muted-foreground">{t("emptyHint")}</p></div>
        ) : (
          <div className="divide-y">
            {visible.map((category) => (
              <div key={category.id} className="grid grid-cols-[minmax(0,1fr)_90px_110px_90px] items-center px-4 py-2.5 text-xs hover:bg-muted/20">
                <div className="flex min-w-0 items-center" style={{ paddingLeft: `${category.depth * 20}px` }}>
                  {category.depth > 0 && <ChevronRight className="mr-1 h-3 w-3 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0"><p className="truncate font-semibold">{category.name}</p><p className="truncate text-[10px] text-muted-foreground">/{category.slug}</p></div>
                </div>
                <span className="tabular-nums">{category._count.products}</span>
                <span className={category.isActive ? "font-semibold text-primary" : "text-muted-foreground"}>{category.isActive ? t("active") : t("inactive")}</span>
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-none" onClick={() => startEdit(category)} aria-label={t("edit")}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" className="rounded-none text-destructive" disabled={remove.isPending} onClick={() => window.confirm(t("deleteConfirm", { name: category.name })) && remove.mutate(category.id)} aria-label={t("delete")}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-none p-0 sm:max-w-xl [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="border-b px-5 py-4"><DialogTitle>{editingId ? t("edit") : t("create")}</DialogTitle><DialogDescription>{t("subtitle")}</DialogDescription></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); setFormError(null); save.mutate(); }}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold">{t("name")}<Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 rounded-none" /></label>
              <label className="space-y-1 text-xs font-semibold">{t("slug")}<Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 rounded-none" /></label>
              <label className="space-y-1 text-xs font-semibold">{t("parent")}<select value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })} className="mt-1 h-10 w-full rounded-none border bg-background px-3 text-xs"><option value="">{t("root")}</option>{flattened.filter((category) => !excludedParentIds.has(category.id)).map((category) => <option key={category.id} value={category.id}>{category.path}</option>)}</select></label>
              <label className="space-y-1 text-xs font-semibold">{t("position")}<Input type="number" min={0} value={form.position} onChange={(event) => setForm({ ...form, position: Number(event.target.value) })} className="mt-1 rounded-none" /></label>
              <label className="space-y-1 text-xs font-semibold sm:col-span-2">{t("description")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 min-h-24 w-full rounded-none border bg-background p-3 text-sm" /></label>
              <div className="space-y-2 sm:col-span-2">
                <span className="text-xs font-semibold">{t("heroImage")}</span>
                <label className="relative flex min-h-40 cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-muted/20 transition-colors hover:border-primary">
                  {heroFile || form.heroImageUrl ? (
                    <Image src={heroFile ? URL.createObjectURL(heroFile) : form.heroImageUrl} alt="" fill unoptimized={Boolean(heroFile)} className="object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground"><ImagePlus className="h-6 w-6" />{t("heroImageHint")}</span>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)} />
                </label>
                {(heroFile || form.heroImageUrl) && <button type="button" onClick={() => { setHeroFile(null); setForm({ ...form, heroImageUrl: "" }); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive"><X className="h-3 w-3" />{t("removeHeroImage")}</button>}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-primary" />{t("active")}</label>
              {formError && <p className="bg-destructive/10 p-3 text-xs text-destructive sm:col-span-2">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4"><Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-none">{t("cancel")}</Button><Button type="submit" disabled={save.isPending} className="rounded-none">{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? t("save") : t("create")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
