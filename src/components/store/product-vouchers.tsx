"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { Ticket, Truck, Tag, Clock, ArrowRight } from "lucide-react";
import type { VoucherBenefit } from "@/lib/voucher/calculator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      return locale === "vi" ? "Freeship" : "Free shipping";
    }
    if (benefit.type === "fixed_amount") {
      return `-${formatPrice(benefit.value, locale)}`;
    }
  }
  return "";
}

export function ProductVouchers({ productId }: { productId: string }) {
  const locale = useLocale();
  const t = useTranslations("Product");
  const [open, setOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ vouchers: ActiveVoucher[] }>({
    queryKey: ["active-product-vouchers", productId],
    queryFn: async () => {
      const response = await fetch(`/api/vouchers/active?productId=${productId}`);
      if (!response.ok) throw new Error("Failed to load vouchers");
      return response.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const vouchers = data?.vouchers ?? [];

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        <div className="h-20 w-[280px] shrink-0 animate-pulse rounded-md border bg-muted/60" aria-hidden="true" />
        <div className="h-20 w-[280px] shrink-0 animate-pulse rounded-md border bg-muted/60" aria-hidden="true" />
      </div>
    );
  }

  if (vouchers.length === 0) return null;

  const displayVouchers = vouchers.slice(0, 3);
  const hasMore = vouchers.length > 3;

  const renderVoucher = (voucher: ActiveVoucher, isCompact = false) => {
    const isCopied = copiedCode === voucher.code;
    const benefitText = formatBenefit(voucher.benefit, locale);
    const isShipping = voucher.benefit.scope === "shipping";
    const label = isShipping
      ? (locale === 'vi' ? 'Vận chuyển' : 'Shipping')
      : (locale === 'vi' ? 'Sản phẩm' : 'Product');

    const minSpend = voucher.minimumCartSubtotal
      ? (locale === 'vi' ? `Đơn từ ${formatPrice(voucher.minimumCartSubtotal, locale)}` : `Min ${formatPrice(voucher.minimumCartSubtotal, locale)}`)
      : (locale === 'vi' ? 'Mọi đơn hàng' : 'All orders');

    const endsAt = new Date(voucher.endsAt);
    const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000));
    const expText = daysLeft <= 7
      ? (daysLeft === 0 ? (locale === 'vi' ? 'Hết hạn hôm nay' : 'Expires today') : (locale === 'vi' ? `Hết hạn sau ${daysLeft} ngày` : `Ends in ${daysLeft}d`))
      : (locale === 'vi' ? `HSD: ${endsAt.toLocaleDateString('vi-VN')}` : `Exp: ${endsAt.toLocaleDateString()}`);

    return (
      <div
        key={voucher.id}
        className={`group relative flex ${isCompact ? 'w-full' : 'w-[280px]'} shrink-0 snap-start items-stretch overflow-hidden rounded-md border border-border/90 bg-card shadow-[0_1px_2px_rgba(39,31,29,0.06),0_5px_14px_rgba(39,31,29,0.06)] transition-all hover:border-primary/30 hover:shadow-[0_2px_4px_rgba(39,31,29,0.07),0_8px_20px_rgba(39,31,29,0.08)]`}
      >
        {/* Left Stub */}
        <div className="flex w-[68px] shrink-0 flex-col items-center justify-center border-r border-border/80 bg-primary/[0.045] px-2 py-3 text-center text-primary">
          <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            {isShipping ? <Truck className="h-4 w-4" strokeWidth={1.7} /> : <Tag className="h-4 w-4" strokeWidth={1.7} />}
          </div>
          <span className="text-[8px] font-bold uppercase leading-tight tracking-[0.08em]">{label}</span>
        </div>

        {/* Middle Content */}
        <div className="flex flex-1 flex-col justify-center px-2.5 py-2 min-w-0">
          <span className="text-sm font-bold leading-tight text-primary">{benefitText}</span>
          <span className="mt-0.5 text-[9px] text-muted-foreground">
            {minSpend}
          </span>
          <div className="mt-1.5 flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-foreground/60 break-all">
              {voucher.code}
            </span>
            <span className="flex items-center gap-1 text-[8px] font-medium text-muted-foreground">
              <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
              {expText}
            </span>
          </div>
        </div>

        {/* Right Claim Button */}
        <div className="flex shrink-0 items-center justify-center pr-2.5">
          <button
            type="button"
            onClick={() => handleCopy(voucher.code)}
            disabled={isCopied}
            className={`flex h-7 items-center justify-center rounded px-3 text-[10px] font-bold transition-all active:scale-95 ${isCopied
                ? 'bg-muted text-muted-foreground'
                : 'border border-primary/25 bg-primary/[0.07] text-primary hover:bg-primary hover:text-primary-foreground'
              }`}
          >
            {isCopied ? (locale === 'vi' ? 'Đã copy' : 'Copied') : (locale === 'vi' ? 'Copy' : 'Copy')}
          </button>
        </div>

      </div>
    );
  };

  return (
    <>
      <div className="w-full">
        <div className="flex w-full snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {displayVouchers.map(v => renderVoucher(v))}

          {hasMore && (
            <button
              onClick={() => setOpen(true)}
              className="flex h-20 shrink-0 snap-start items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 px-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {t("viewAll")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(80dvh,680px)] overflow-hidden rounded-none border bg-card p-0 shadow-2xl ring-0 sm:max-w-[500px] [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="border-b px-5 py-4 pr-14 bg-muted/20">
            <div className="flex items-center gap-2 text-foreground">
              <Ticket className="h-4 w-4" />
              <DialogTitle className="text-base font-bold">{t("voucherDialogTitle")}</DialogTitle>
            </div>
            <DialogDescription className="text-xs">{t("voucherDialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-3">
              {vouchers.map(v => renderVoucher(v, true))}
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">{t("tapVoucherToCopy")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
