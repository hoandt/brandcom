"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";

interface FooterProps {
  locale: string;
  dynamicFooter?: any;
  logoUrl?: string;
}

export function Footer({ locale, dynamicFooter, logoUrl }: FooterProps) {
  const pathname = usePathname();
  const t = useTranslations("Footer");
  const { data } = useQuery<{ settings: { storeName: string; tagline: string | null; legalName: string | null } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
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
          <div className="space-y-3">
            <Link href={`/${locale}`} className="inline-block">
              <Logo logoUrl={logoUrl} className="h-8 w-auto text-primary" />
            </Link>
            {data?.settings.tagline ? (
              <p className="text-sm text-muted-foreground">{data.settings.tagline}</p>
            ) : null}
            <div className="pt-1 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground/80">{t("companyName")}</p>
              <ul className="space-y-1">
                <li>• {t("taxCodeLabel")}: {t("taxCode")}</li>
                <li>• {t("addressLabel")}: {t("address")}</li>
              </ul>
            </div>
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
                <h4 className="text-sm font-semibold">{t("shop")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/collections/new`}>{t("newArrivals")}</Link></li>
                  <li><Link href={`/${locale}/collections/all`}>{t("allProducts")}</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">{t("company")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/pages/about-us`}>{t("about")}</Link></li>
                  <li><Link href={`/${locale}/contact`}>{t("contact")}</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">{t("legal")}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href={`/${locale}/terms`}>{t("terms")}</Link></li>
                  <li><Link href={`/${locale}/privacy`}>{t("privacy")}</Link></li>
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {data?.settings.legalName || storeName}. {t("allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
