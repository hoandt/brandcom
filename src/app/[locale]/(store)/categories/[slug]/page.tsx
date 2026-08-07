import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getDescendantIds } from "@/lib/categories";
import { getTranslations } from "next-intl/server";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();

  const [category, allCategories] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      include: { children: { where: { isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }] } },
    }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, parentId: true } }),
  ]);

  if (!category || !category.isActive) {
    notFound();
  }
  const categoryIds = [category.id, ...getDescendantIds(allCategories, category.id)];
  const [products, tNavbar] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", categories: { some: { id: { in: categoryIds }, isActive: true } } },
      include: { variants: { where: { isActive: true } }, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    getTranslations("Navbar"),
  ]);
  return (
    <div>
      {/* Category Hero */}
      {category.heroImageUrl ? (
        <section className="relative -mt-20 flex h-[52vh] min-h-[26rem] max-h-[34rem] items-end overflow-hidden pt-20 text-white">
          <Image src={category.heroImageUrl} alt={category.name} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
          <div className="storefront-container relative z-10 pb-20 pt-24 md:pb-20">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">{tNavbar("shopByCategory")}</p>
            <h1 className="max-w-3xl font-heading text-5xl tracking-tight md:text-6xl">{category.name}.</h1>
            {category.description && <p className="mt-4 max-w-lg text-sm leading-6 text-white/85 md:text-base">{category.description}</p>}
          </div>
        </section>
      ) : (
        <section className="relative -mt-20 flex h-[52vh] min-h-[26rem] max-h-[34rem] items-end overflow-hidden bg-gradient-to-br from-[#fff7f7] via-[#fdeeed] to-[#f7dcdb] pt-20 text-foreground">
          <div className="storefront-container relative z-10 flex flex-col gap-4 pb-20 pt-24 md:flex-row md:items-end md:justify-between">
            <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/75">{tNavbar("shopByCategory")}</p><h1 className="font-heading text-5xl tracking-tight md:text-6xl">{category.name}.</h1></div>
            {category.description && <p className="max-w-md text-sm leading-6 text-foreground/75 md:text-base">{category.description}</p>}
          </div>
        </section>
      )}

      <div className="storefront-container py-4 md:py-5">
      {category.children.length > 0 && (
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Subcategories">
            <div className="shrink-0 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              All Products
            </div>
            {category.children.map((child) => (
              <Link key={child.id} href={`/${locale}/categories/${child.slug}`} className="shrink-0 bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                {child.name}
              </Link>
            ))}
          </nav>
      )}

      {/* Product count and sort share one compact row. */}
      <div className="mb-4 mt-3 flex items-center justify-between gap-3">
        <span className="shrink-0 text-xs text-muted-foreground md:text-sm">{products.length} styles</span>
        <div className="relative w-36 sm:w-44">
          <select className="h-9 w-full appearance-none border bg-background px-3 pr-8 text-xs outline-none focus:ring-1 focus:ring-primary md:text-sm">
            <option>Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Newest</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
        {products.map((product) => {
          const mainImage = product.images[0]?.url;
          return (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              className="group flex flex-col gap-3"
            >
              <div className="aspect-[4/5] bg-secondary overflow-hidden relative rounded-sm">
                <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm px-2 py-1 text-[10px] font-bold tracking-wider rounded-sm text-foreground">
                  SALE
                </div>
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-secondary flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                    <span className="text-muted-foreground font-heading uppercase tracking-widest text-xs">
                      No Image
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col text-left">
                <h3 className="font-medium text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-foreground mt-2 font-medium text-sm">
                  ${product.variants[0]?.price?.toString() || "0.00"}
                </p>
              </div>
            </Link>
          );
        })}

        {products.length === 0 && (
          <div className="col-span-full text-center py-32 text-muted-foreground border border-dashed">
            <span className="font-heading uppercase tracking-widest">
              No products found in this category
            </span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
