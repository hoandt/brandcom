import { brandConfig } from "@/lib/brand-config";

export const storefrontSiteUrl = brandConfig.siteUrl.replace(/\/$/, "");
export const storefrontLocales = ["vi", "en", "th"] as const;

export function storefrontAlternates(locale: string, path = "") {
  return {
    canonical: `${storefrontSiteUrl}/${locale}${path}`,
    languages: {
      vi: `${storefrontSiteUrl}/vi${path}`,
      en: `${storefrontSiteUrl}/en${path}`,
      th: `${storefrontSiteUrl}/th${path}`,
      "x-default": `${storefrontSiteUrl}/vi${path}`,
    },
  };
}
