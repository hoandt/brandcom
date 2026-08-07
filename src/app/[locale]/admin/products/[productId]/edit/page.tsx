"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import EditProductForm from "./edit-form";

type ProductFormData = Parameters<typeof EditProductForm>[0]["initialData"];

export default function EditProductPage() {
  const t = useTranslations("AdminProducts");
  const { productId } = useParams<{ productId: string }>();
  const query = useQuery<{ product: ProductFormData }>({
    queryKey: ["admin-product", productId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/products/${productId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || t("loadError"));
      return json;
    },
    enabled: Boolean(productId),
  });

  if (query.isLoading) return <div className="flex min-h-64 items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loading")}</div>;
  if (query.isError || !query.data) return <div className="border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">{query.error?.message || t("loadError")}</div>;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
      <div><h1 className="text-2xl font-bold tracking-tight">{t("editTitle")}</h1><p className="text-xs text-muted-foreground">{t("editSubtitle")}</p></div>
      <EditProductForm initialData={query.data.product} />
    </div>
  );
}
