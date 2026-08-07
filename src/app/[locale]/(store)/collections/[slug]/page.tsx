import { getTranslations } from "next-intl/server";
import { CollectionClient } from "./collection-client";
import { notFound } from "next/navigation";
import { CollectionCategoryNavigation } from "@/components/storefront/category-navigation";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const validSlugs = ["new", "all"];
  
  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const t = await getTranslations("Navbar");

  let title = "";
  let description = "";

  if (slug === "new") {
    title = t("newArrivals");
    description = t("newCollectionDescription");
  } else if (slug === "all") {
    title = t("allProducts");
    description = t("allCollectionDescription");
  }

  return (
    <div className="storefront-container min-h-[60vh] py-12">
      {/* Collection Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading tracking-tight capitalize">
          {title}.
        </h1>
        {description && (
          <p className="text-muted-foreground font-light text-sm md:text-base max-w-md">
            {description}
          </p>
        )}
      </div>

      <CollectionCategoryNavigation />

      {/* Product Grid (Client Component) */}
      <CollectionClient slug={slug} />
    </div>
  );
}
