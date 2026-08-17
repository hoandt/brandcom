"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/ui/logo";

interface FooterProps {
  locale: string;
  dynamicFooter?: any;
  logoUrl?: string;
}

export function Footer({ locale, dynamicFooter, logoUrl }: FooterProps) {
  const pathname = usePathname();
  const { data } = useQuery<{ settings: { storeName: string; tagline: string | null; legalName: string | null } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const storeName = data?.settings.storeName || "Store";

  // Do not show footer on checkout or cart pages
  if (pathname.includes("/checkout") || pathname.includes("/cart")) {
    return null;
  }

  return (
    <footer className="border-t bg-muted/20">
      <div className="storefront-container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href={`/${locale}`} className="inline-block">
              <Logo logoUrl={logoUrl} className="h-8 w-auto text-primary" />
            </Link>
            <p className="text-sm text-muted-foreground">{data?.settings.tagline || ""}</p>
          </div>
          {dynamicFooter && Array.isArray(dynamicFooter) && dynamicFooter.length > 0 ? (
            dynamicFooter.map((col, idx) => (
              <div key={idx} className="space-y-4">
                <h4 className="text-sm font-semibold">{col.title || col.label}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(col.children || []).map((link: any, i: number) => (
                    <li key={i}>
                      <Link href={link.href.startsWith('/') && !link.href.startsWith(`/${locale}`) ? `/${locale}${link.href}` : link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Shop</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/collections/new`}>New Arrivals</Link></li>
                  <li><Link href={`/${locale}/collections/all`}>All Products</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/pages/about-us`}>About</Link></li>
                  <li><Link href={`/${locale}/contact`}>Contact</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/terms`}>Terms of Service</Link></li>
                  <li><Link href={`/${locale}/privacy`}>Privacy Policy</Link></li>
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {data?.settings.legalName || storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
