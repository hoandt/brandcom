"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const pathname = usePathname();
  const { data } = useQuery<{ settings: { storeName: string; tagline: string | null; legalName: string | null } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const storeName = data?.settings.storeName || "Store";

  // Do not show footer on checkout or cart pages
  if (pathname.includes("/checkout") || pathname.includes("/cart")) {
    return null;
  }

  return (
    <footer className="border-t bg-muted/20">
      <div className="storefront-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{storeName}</h3>
            <p className="text-sm text-muted-foreground">{data?.settings.tagline || ""}</p>
          </div>
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
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {data?.settings.legalName || storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
