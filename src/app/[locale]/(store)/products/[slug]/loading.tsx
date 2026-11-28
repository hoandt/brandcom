import palette from "@/components/storefront/product-palette.module.css";

export default function Loading() {
  return (
    <div className={`${palette.productContainer} pt-3 pb-24 lg:pt-7`} aria-hidden="true">
      <div className={palette.productGrid}>
        <div className="grid gap-3 lg:grid-cols-[3.5rem_minmax(0,1fr)]">
          <div className="hidden gap-2 self-start lg:grid">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="size-14 animate-pulse rounded-sm bg-muted" />
            ))}
          </div>
          <div className="aspect-[4/5] w-full animate-pulse rounded-[1rem] bg-muted" />
        </div>

        <div className="grid gap-3 lg:pt-1">
          <div className="h-9 w-4/5 animate-pulse rounded-sm bg-muted" />
          <div className="mb-3 h-7 w-1/3 animate-pulse rounded-sm bg-muted" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-sm bg-muted" />
          ))}
          <div className="h-12 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
