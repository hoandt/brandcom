"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const pathname = usePathname();

  // Do not show footer on checkout or cart pages
  if (pathname.includes("/checkout") || pathname.includes("/cart")) {
    return null;
  }

  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">AURIA</h3>
            <p className="text-sm text-muted-foreground">Premium quality products for modern living.</p>
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
              <li><Link href={`/${locale}/about`}>About</Link></li>
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
          &copy; {new Date().getFullYear()} Auria. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
