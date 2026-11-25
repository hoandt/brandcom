import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStorefrontProductName(name: string, locale: string) {
  const words = name.trim().replace(/\s+/g, " ").toLocaleLowerCase(locale)
    .replace(/(\d)\s*(cm|mm)\b/g, "$1 $2")
    .replace(/\bauria\b/g, "Auria")
    .replace(/\bbare\b/g, "Bare");
  return words.charAt(0).toLocaleUpperCase(locale) + words.slice(1);
}

export function formatPrice(price: number, locale: string, currency?: string) {
  const resolvedCurrency = currency || (locale === "vi" ? "VND" : "USD");
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: resolvedCurrency,
  }).format(price);
}
