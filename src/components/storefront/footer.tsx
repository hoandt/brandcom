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
            <div className="footer-social pt-2 space-y-2">
              <h4 className="title-footer text-sm font-semibold text-foreground">{t("connectWithUs")}</h4>
              <ul className="footerNav-social flex items-center gap-2.5">
                <li>
                  <a
                    href="https://www.facebook.com/auriavn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                    aria-label="Facebook"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-none bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23" fill="none">
                      <g clipPath="url(#clip0_footer_fb)">
                        <path
                          d="M11.5 0.554688C5.42492 0.554688 0.5 5.47961 0.5 11.5547C0.5 16.7132 4.05168 21.042 8.84284 22.2308V14.9163H6.57464V11.5547H8.84284V10.1062C8.84284 6.36225 10.5373 4.62689 14.213 4.62689C14.91 4.62689 16.1125 4.76373 16.6044 4.90013V7.94713C16.3448 7.91985 15.8938 7.90621 15.3337 7.90621C13.5302 7.90621 12.8332 8.58953 12.8332 10.3658V11.5547H16.4262L15.8089 14.9163H12.8332V22.4742C18.28 21.8164 22.5004 17.1788 22.5004 11.5547C22.5 5.47961 17.5751 0.554688 11.5 0.554688Z"
                          fill="currentColor"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_footer_fb">
                          <rect width="22" height="22" fill="white" transform="translate(0.5 0.554688)" />
                        </clipPath>
                      </defs>
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.tiktok.com/@auriabeauty?lang=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="TikTok"
                    aria-label="TikTok"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-none bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23" fill="none">
                      <g clipPath="url(#clip0_footer_tiktok)">
                        <path
                          d="M16.1495 0.554688H12.4418V15.5402C12.4418 17.3257 11.0158 18.7924 9.24125 18.7924C7.46665 18.7924 6.04064 17.3257 6.04064 15.5402C6.04064 13.7866 7.43496 12.3518 9.1462 12.288V8.52572C5.37517 8.58945 2.33301 11.6822 2.33301 15.5402C2.33301 19.4301 5.43854 22.5547 9.27295 22.5547C13.1073 22.5547 16.2128 19.3982 16.2128 15.5402V7.85612C17.6072 8.87643 19.3184 9.48223 21.1247 9.51413V5.75179C18.3361 5.65614 16.1495 3.36048 16.1495 0.554688Z"
                          fill="currentColor"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_footer_tiktok">
                          <rect width="22" height="22" fill="white" transform="translate(0.5 0.554688)" />
                        </clipPath>
                      </defs>
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="https://shopee.vn/auriavn"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Shopee"
                    aria-label="Shopee"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-none bg-primary text-primary-foreground transition-opacity hover:opacity-85"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 6.5h-3.05a4.45 4.45 0 0 0-8.9 0H4.5a1 1 0 0 0-1 1.07l1.12 12.5A2 2 0 0 0 6.61 22h10.78a2 2 0 0 0 1.99-1.93l1.12-12.5a1 1 0 0 0-1-1.07ZM12 3.8a2.7 2.7 0 0 1 2.68 2.7H9.32A2.7 2.7 0 0 1 12 3.8Zm.06 14.45c-1.85 0-3.28-.85-3.62-2.22l1.55-.42c.24.83 1.02 1.28 2.09 1.28.98 0 1.62-.42 1.62-1.06 0-.62-.5-.92-1.86-1.26-1.76-.43-2.97-1.02-2.97-2.55 0-1.46 1.25-2.47 3.07-2.47 1.63 0 2.86.73 3.28 2.01l-1.52.47c-.24-.7-.85-1.12-1.78-1.12-.88 0-1.44.4-1.44.98 0 .56.48.86 1.79 1.18 1.83.45 3.04 1.05 3.04 2.63 0 1.54-1.28 2.55-3.25 2.55Z" />
                    </svg>
                  </a>
                </li>
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
