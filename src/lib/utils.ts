import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, locale: string, currency?: string) {
  const resolvedCurrency = currency || (locale === "vi" ? "VND" : "USD");
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: resolvedCurrency,
  }).format(price);
}
