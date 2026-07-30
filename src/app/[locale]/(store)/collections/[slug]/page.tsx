import { getTranslations } from "next-intl/server";
import { CollectionClient } from "./collection-client";
import { notFound } from "next/navigation";

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

  const t = await getTranslations("Navbar"); // Reusing Navbar translations for title

  let title = "";
  let description = "";

  if (slug === "new") {
    title = t("newArrivals");
    description = "The latest additions to our curated collection.";
  } else if (slug === "all") {
    title = t("allProducts");
    description = "Explore our complete range of premium essentials.";
  }

  return (
    <div className="container mx-auto py-12 px-4 md:px-8 min-h-[60vh]">
      {/* Collection Header */}
      <div className="mb-12 text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl md:text-5xl font-heading uppercase tracking-widest">
          {title}
        </h1>
        <p className="text-muted-foreground font-light text-sm md:text-base">
          {description}
        </p>
      </div>

      {/* Product Grid (Client Component) */}
      <CollectionClient slug={slug} />
    </div>
  );
}
