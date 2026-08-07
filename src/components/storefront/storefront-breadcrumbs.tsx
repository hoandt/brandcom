import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export type StorefrontBreadcrumbItem = { label: string; href?: string };

export function StorefrontBreadcrumbs({ items, label, inverted = false }: { items: StorefrontBreadcrumbItem[]; label: string; inverted?: boolean }) {
  return (
    <nav aria-label={label} className={`min-w-0 overflow-hidden border-b pb-2 ${inverted ? "border-white/25" : "border-border/60"}`}>
      <ol className={`flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${inverted ? "text-white/70" : "text-muted-foreground"}`}>
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={`flex min-w-0 items-center gap-1.5 ${isCurrent ? "shrink min-w-[5rem]" : "shrink-0"}`}>
              {index > 0 && <ChevronRight className={`h-3 w-3 shrink-0 ${inverted ? "text-white/40" : "text-muted-foreground/50"}`} aria-hidden="true" />}
              {item.href && !isCurrent ? (
                <Link href={item.href} className={`inline-flex items-center gap-1 ${inverted ? "hover:text-white" : "hover:text-primary"}`}>
                  {isFirst && <Home className="h-3 w-3" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className={`truncate ${isCurrent ? (inverted ? "text-white" : "text-foreground") : ""}`} title={item.label}>
                  {isFirst && <Home className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
