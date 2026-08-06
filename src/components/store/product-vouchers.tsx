"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { Ticket, Copy, Check } from "lucide-react";
import type { VoucherBenefit } from "@/lib/voucher/calculator";

type ActiveVoucher = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  benefit: VoucherBenefit;
  minimumCartSubtotal: number | null;
  endsAt: string;
};

function formatBenefit(benefit: VoucherBenefit, locale: string): string {
  if (benefit.scope === "cart") {
    if (benefit.type === "fixed_amount") {
      return `-${formatPrice(benefit.value, locale)}`;
    }
    if (benefit.type === "percentage") {
      const base = `-${benefit.value}%`;
      if (benefit.maxDiscountAmount) {
        return `${base} (max ${formatPrice(benefit.maxDiscountAmount, locale)})`;
      }
      return base;
    }
  }
  if (benefit.scope === "shipping") {
    if (benefit.type === "free_shipping") {
      return locale === "vi" ? "Miễn phí vận chuyển" : "Free shipping";
    }
    if (benefit.type === "fixed_amount") {
      return `${locale === "vi" ? "Giảm" : "Save"} ${formatPrice(benefit.value, locale)} ${locale === "vi" ? "phí ship" : "shipping"}`;
    }
  }
  return "";
}

export function ProductVouchers({ productId }: { productId: string }) {
  const locale = useLocale();
  const t = useTranslations("Product");
  const [vouchers, setVouchers] = useState<ActiveVoucher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVouchers() {
      try {
        const res = await fetch(`/api/vouchers/active?productId=${productId}`);
        if (!res.ok) return;
        const data = await res.json();
        setVouchers(data.vouchers || []);
      } catch {
        // silently fail - vouchers are non-critical
      }
    }
    fetchVouchers();
  }, [productId]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  if (vouchers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Ticket className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("availableVouchers")}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {vouchers.map((v) => {
          const isCopied = copiedCode === v.code;
          const benefitText = formatBenefit(v.benefit, locale);
          const endsAt = new Date(v.endsAt);
          const daysLeft = Math.max(
            0,
            Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          );

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => handleCopy(v.code)}
              className="group relative flex-shrink-0 flex items-stretch border border-primary/15 bg-primary/[0.04] hover:bg-primary/[0.06] hover:border-primary/30 transition-all rounded-xl overflow-hidden"
            >
              {/* Left side: Benefit */}
              <div className="flex items-center justify-center px-3 py-2 bg-primary/10 border-r border-dashed border-primary/20">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary whitespace-nowrap">
                  {benefitText}
                </span>
              </div>

              {/* Right side: Code and info */}
              <div className="flex flex-col justify-center px-3 py-2 gap-0.5 min-w-[120px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-foreground">
                    {v.code}
                  </span>
                  {isCopied ? (
                    <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  )}
                </div>

                <div className="flex items-center gap-1 text-[9px] text-muted-foreground whitespace-nowrap">
                  {v.minimumCartSubtotal !== null && v.minimumCartSubtotal > 0 && (
                    <span>
                      {t("minOrder", { amount: formatPrice(v.minimumCartSubtotal, locale) })}
                    </span>
                  )}
                  {v.minimumCartSubtotal !== null && v.minimumCartSubtotal > 0 && daysLeft <= 7 && (
                    <span>•</span>
                  )}
                  {daysLeft <= 7 && (
                    <span className="text-destructive/80 font-semibold">
                      {daysLeft === 0
                        ? t("expirestoday")
                        : t("daysLeft", { count: daysLeft })}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
