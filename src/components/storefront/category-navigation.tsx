"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { buildCategoryTree, flattenCategoryTree, type CategoryNodeInput, type CategoryTreeNode, type FlatCategoryNode } from "@/lib/categories";

type NavigationCategory = CategoryNodeInput & { _count: { products: number }; imageUrl: string | null };
type NavigationTree = CategoryTreeNode<NavigationCategory>;
type NavigationItem = FlatCategoryNode<NavigationCategory>;

function useCategoryNavigation() {
  return useQuery<{ categories: NavigationCategory[] }>({
    queryKey: ["storefront-category-navigation"],
    queryFn: async () => {
      const response = await fetch("/api/categories/navigation");
      if (!response.ok) throw new Error("Failed to load category navigation");
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

function resolvedImages(roots: NavigationTree[]) {
  const images = new Map<string, string | null>();
  const visit = (node: NavigationTree): string | null => {
    const image = node.imageUrl ?? node.children.map(visit).find(Boolean) ?? null;
    images.set(node.id, image);
    return image;
  };
  roots.forEach(visit);
  return images;
}

function visibleItems(roots: NavigationTree[], selectedId: string) {
  const all = flattenCategoryTree(roots);
  if (selectedId === "all") return all.filter((category) => category.depth === 0);
  const selected = roots.find((root) => root.id === selectedId);
  if (!selected) return all.filter((category) => category.depth === 0);
  const branch = flattenCategoryTree([selected]);
  return branch.length > 1 ? branch.slice(1) : branch;
}

function CategoryCard({ item, imageUrl, locale, onNavigate, compact = false }: { item: NavigationItem; imageUrl: string | null; locale: string; onNavigate?: () => void; compact?: boolean }) {
  return (
    <Link href={`/${locale}/categories/${item.slug}`} onClick={onNavigate} className="group block min-w-0">
      <div className={`relative overflow-hidden border bg-muted/30 ${compact ? "aspect-square" : "aspect-[4/3]"}`}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes={compact ? "50vw" : "(max-width: 1280px) 20vw, 180px"} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40"><span className="font-heading text-3xl text-muted-foreground/25">A</span></div>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 border-x border-b px-2.5 py-2.5">
        <div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-[0.08em]">{item.name}</p>{item.depth > 0 && <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.path}</p>}</div>
        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function CategoryLoadingGrid({ compact = false }: { compact?: boolean }) {
  return <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"}`}>{Array.from({ length: compact ? 6 : 12 }).map((_, index) => <div key={index} className="animate-pulse"><div className={`${compact ? "aspect-square" : "aspect-[4/3]"} bg-muted`} /><div className="h-10 border-x border-b bg-muted/40" /></div>)}</div>;
}

function CategoryTabs({ roots, selectedId, onSelect }: { roots: NavigationTree[]; selectedId: string; onSelect: (id: string) => void }) {
  const t = useTranslations("Navbar");
  return (
    <div className="flex min-w-0 gap-7 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" onClick={() => onSelect("all")} className={`shrink-0 border-b-2 px-0.5 py-4 text-xs font-bold uppercase tracking-[0.12em] ${selectedId === "all" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t("all")}</button>
      {roots.map((root) => <button key={root.id} type="button" onClick={() => onSelect(root.id)} className={`shrink-0 border-b-2 px-0.5 py-4 text-xs font-bold uppercase tracking-[0.12em] ${selectedId === root.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{root.name}</button>)}
    </div>
  );
}

export function DesktopCategoryMenu({ transparent, active, isOpen, onOpenChange }: { transparent: boolean; active: boolean; isOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  const locale = useLocale();
  const t = useTranslations("Navbar");
  const query = useCategoryNavigation();
  
  // Keep internal state for fallback if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [selectedId, setSelectedId] = useState("all");
  const roots = useMemo(() => buildCategoryTree(query.data?.categories ?? []), [query.data]);
  const images = useMemo(() => resolvedImages(roots), [roots]);
  const items = useMemo(() => visibleItems(roots, selectedId), [roots, selectedId]);
  const linkColor = transparent ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const activeBorder = active ? (transparent ? "border-white text-white" : "border-primary text-foreground") : "border-transparent";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Using a timeout to prevent flickering when mouse moves between button and portal
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      className="flex h-full items-center"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="desktop-catalogue-menu"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 border-b-2 py-3 font-heading text-[0.85rem] font-bold uppercase tracking-[0.15em] outline-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${activeBorder} ${linkColor}`}
      >
        {t("shop")}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id="desktop-catalogue-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("catalogueMenu")}
          onClick={() => setOpen(false)}
          className="absolute inset-x-0 top-[100%] h-[100vh] z-[100] bg-foreground/20 font-heading text-foreground backdrop-blur-[2px] animate-in fade-in duration-150"
        >
          <div 
            onClick={(event) => event.stopPropagation()} 
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
            className="flex max-h-[min(72dvh,44rem)] w-full flex-col overflow-hidden border-b bg-background shadow-[0_18px_45px_rgba(39,31,29,0.16)] animate-in slide-in-from-top-2 duration-200"
          >
            <header className="shrink-0 border-b bg-background">
              <div className="storefront-container flex items-center gap-8">
                <div className="min-w-0 flex-1"><CategoryTabs roots={roots} selectedId={selectedId} onSelect={setSelectedId} /></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{locale}</span>
                <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center border outline-none hover:border-primary hover:text-primary focus-visible:border-primary" aria-label={t("closeMenu")}><X className="h-4 w-4" /></button>
              </div>
            </header>
            <main className="storefront-container min-h-0 overflow-y-auto py-6">
              <div className="mb-5 flex items-end justify-between border-b pb-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{t("shopByCategory")}</p><p className="mt-1 text-xs text-muted-foreground">{t("browseCategoryHint")}</p></div>
                <div className="flex gap-5 text-[10px] font-bold uppercase tracking-wider"><Link href={`/${locale}/collections/new`} onClick={() => setOpen(false)} className="hover:text-primary">{t("newArrivals")}</Link><Link href={`/${locale}/collections/all`} onClick={() => setOpen(false)} className="hover:text-primary">{t("allProducts")}</Link></div>
              </div>
              {query.isLoading ? <CategoryLoadingGrid /> : query.isError ? <p className="border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{t("categoryLoadError")}</p> : items.length ? <div className="grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-5 xl:grid-cols-6">{items.map((item) => <CategoryCard key={item.id} item={item} imageUrl={images.get(item.id) ?? null} locale={locale} onNavigate={() => setOpen(false)} />)}</div> : <p className="py-16 text-center text-sm text-muted-foreground">{t("noCategories")}</p>}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileCategoryMenu({ onNavigate }: { onNavigate: () => void }) {
  const locale = useLocale();
  const t = useTranslations("Navbar");
  const query = useCategoryNavigation();
  const [selectedId, setSelectedId] = useState("all");
  const roots = useMemo(() => buildCategoryTree(query.data?.categories ?? []), [query.data]);
  const images = useMemo(() => resolvedImages(roots), [roots]);
  const items = useMemo(() => visibleItems(roots, selectedId), [roots, selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col font-heading normal-case tracking-normal">
      <div className="shrink-0 px-4">
        <CategoryTabs roots={roots} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-4 grid grid-cols-2 gap-2"><Link href={`/${locale}/collections/new`} onClick={onNavigate} className="flex items-center justify-between border p-3 text-[10px] font-bold uppercase tracking-wider">{t("newArrivals")}<ArrowRight className="h-3 w-3" /></Link><Link href={`/${locale}/collections/all`} onClick={onNavigate} className="flex items-center justify-between border p-3 text-[10px] font-bold uppercase tracking-wider">{t("allProducts")}<ArrowRight className="h-3 w-3" /></Link></div>
        {query.isLoading ? <CategoryLoadingGrid compact /> : query.isError ? <p className="p-4 text-xs text-destructive">{t("categoryLoadError")}</p> : items.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-5">{items.map((item) => <CategoryCard key={item.id} item={item} imageUrl={images.get(item.id) ?? null} locale={locale} onNavigate={onNavigate} compact />)}</div> : <p className="py-16 text-center text-xs text-muted-foreground">{t("noCategories")}</p>}
        <Link href={`/${locale}/pages/about-us`} onClick={onNavigate} className="mt-8 flex items-center justify-between border-t py-5 text-xs font-bold uppercase tracking-wider">{t("aboutUs")}<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

export function CollectionCategoryNavigation() {
  const locale = useLocale();
  const t = useTranslations("Navbar");
  const query = useCategoryNavigation();
  const roots = useMemo(() => buildCategoryTree(query.data?.categories ?? []), [query.data]);
  const images = useMemo(() => resolvedImages(roots), [roots]);

  const productCount = (category: NavigationTree): number =>
    category._count.products + category.children.reduce((total, child) => total + productCount(child), 0);

  if (query.isLoading) {
    return (
      <section className="mb-8" aria-label={t("loadingCategories")}>
        <div className="mb-3 h-6 w-40 animate-pulse bg-muted" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 w-[min(76vw,17rem)] shrink-0 animate-pulse bg-muted" />)}
        </div>
      </section>
    );
  }

  if (query.isError) {
    return (
      <div className="mb-8 flex items-center justify-between gap-4 border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <span>{t("categoryLoadError")}</span>
        <button type="button" onClick={() => query.refetch()} className="inline-flex shrink-0 items-center gap-2 font-bold uppercase tracking-wider hover:opacity-70">
          <RefreshCw className="h-3.5 w-3.5" />{t("tryAgain")}
        </button>
      </div>
    );
  }

  if (!roots.length) return null;

  return (
    <section aria-labelledby="collection-categories-title" className="mb-8 border-b pb-8">
      <div className="mb-3 flex items-end justify-between gap-5">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-primary">{t("discover")}</p>
          <h2 id="collection-categories-title" className="font-heading text-xl tracking-tight md:text-2xl">{t("shopByCategory")}</h2>
        </div>
        <span className="pb-1 text-xs text-muted-foreground">{roots.length} {t("categories")}</span>
      </div>

      <nav aria-label={t("shopByCategory")} className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {roots.map((root) => {
          const imageUrl = images.get(root.id);
          const count = productCount(root);

          return (
            <Link key={root.id} href={`/${locale}/categories/${root.slug}`} className="group relative h-36 w-[min(76vw,17rem)] shrink-0 overflow-hidden bg-muted md:h-40 md:w-72">
              {imageUrl ? (
                <Image src={imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]">
                  <span className="font-heading text-6xl text-foreground/10">{root.name.charAt(0)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent transition-colors group-hover:from-black/90" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 text-white">
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-sm font-bold uppercase tracking-[0.1em]">{root.name}</h3>
                  <p className="mt-1 text-[10px] text-white/70">{count} {count === 1 ? t("product") : t("products")}</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 bg-black/10 backdrop-blur-sm transition-transform group-hover:translate-x-0.5 group-hover:border-white">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
