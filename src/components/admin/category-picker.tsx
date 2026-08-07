"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildCategoryTree, flattenCategoryTree, type CategoryNodeInput } from "@/lib/categories";

type Category = CategoryNodeInput & { description: string | null };

export function CategoryPicker({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations("AdminCategories");
  const { data, isLoading, isError } = useQuery<{ categories: Category[] }>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const response = await fetch("/api/admin/categories");
      if (!response.ok) throw new Error(t("loadError"));
      return response.json();
    },
    staleTime: 30_000,
  });
  const categories = flattenCategoryTree(buildCategoryTree(data?.categories ?? [])).filter((category) => category.isActive);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id]);
  };

  return (
    <section className="border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Tags className="h-4 w-4 text-primary" />{t("selectLabel")}</div>
        <p className="mt-1 text-xs text-muted-foreground">{t("selectHint")}</p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div>
      ) : isError ? (
        <p className="px-4 py-6 text-xs text-destructive">{t("loadError")}</p>
      ) : categories.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="max-h-64 divide-y overflow-y-auto">
          {categories.map((category) => {
            const selected = selectedIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggle(category.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs hover:bg-muted/40"
                style={{ paddingLeft: `${16 + category.depth * 20}px` }}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">{category.path}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
