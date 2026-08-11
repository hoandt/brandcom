"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { Ticket, X, Tag, Truck, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type VoucherBenefit = {
  scope: "cart" | "shipping";
  type: "fixed_amount" | "percentage" | "free_shipping";
  value?: number;
  maxDiscountAmount?: number;
  canCombine?: boolean;
};

type ActiveVoucher = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  benefit: VoucherBenefit;
  minimumCartSubtotal: number | null;
  endsAt: string;
};

type AppliedCoupon = {
  code: string;
  type: string;
  value: number;
  discountAmount: number;
  shippingDiscountAmount: number;
  canCombine: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  appliedCoupons: AppliedCoupon[];
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: (code: string) => void;
};

function formatBenefit(benefit: VoucherBenefit, locale: string): string {
  if (benefit.scope === "shipping" && benefit.type === "free_shipping") {
    return locale === "vi" ? "Miễn phí vận chuyển" : "Free Shipping";
  }
  if (benefit.scope === "shipping" && benefit.type === "fixed_amount" && benefit.value) {
    return locale === "vi"
      ? `Giảm ${formatPrice(benefit.value, locale)} phí vận chuyển`
      : `${formatPrice(benefit.value, locale)} off shipping`;
  }
  if (benefit.scope === "cart") {
    if (benefit.type === "fixed_amount" && benefit.value) {
      return `-${formatPrice(benefit.value, locale)}`;
    }
    if (benefit.type === "percentage" && benefit.value) {
      const base = `${locale === "vi" ? "Giảm" : "Save"} ${benefit.value}%`;
      if (benefit.maxDiscountAmount) {
        return `${base} (max ${formatPrice(benefit.maxDiscountAmount, locale)})`;
      }
      return base;
    }
  }
  return "";
}

function VoucherCard({
  voucher,
  isSelected,
  isApplied,
  isEligible,
  isCombinationBlocked,
  locale,
  onSelect,
}: {
  voucher: ActiveVoucher;
  isSelected: boolean;
  isApplied: boolean;
  isEligible: boolean;
  isCombinationBlocked: boolean;
  locale: string;
  onSelect: () => void;
}) {
  const isShipping = voucher.benefit.scope === "shipping";
  const endsAt = new Date(voucher.endsAt);
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const expiringSoon = daysLeft <= 3;
  const benefitText = formatBenefit(voucher.benefit, locale);
  const isActive = isSelected || isApplied;

  return (
    <button
      type="button"
      onClick={isEligible || isApplied ? onSelect : undefined}
      className={cn(
        "w-full flex items-stretch text-left transition-all rounded-xl border overflow-hidden",
        isActive
          ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
          : isEligible
          ? "border-border/60 bg-white dark:bg-neutral-900 hover:border-primary/40 hover:shadow-sm cursor-pointer"
          : "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
      )}
    >
      {/* Left accent strip */}
      <div
        className={cn(
          "flex flex-col items-center justify-center px-3 py-4 gap-1.5 min-w-[72px] border-r border-dashed",
          isActive
            ? "bg-primary/10 border-primary/30"
            : "bg-primary/[0.04] border-primary/15"
        )}
      >
        {isShipping ? (
          <Truck className={cn("w-5 h-5", isActive ? "text-primary" : "text-primary/60")} />
        ) : (
          <Tag className={cn("w-5 h-5", isActive ? "text-primary" : "text-primary/60")} />
        )}
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-wider text-center leading-tight",
            isActive ? "text-primary" : "text-primary/50"
          )}
        >
          {isShipping
            ? voucher.benefit.type === "free_shipping"
              ? "Free\nship"
              : locale === "vi" ? "Phí\nship" : "Ship\noff"
            : locale === "vi" ? "Giảm\ngiá" : "Dis-\ncount"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center px-3 py-3 gap-1 min-w-0">
        <p className={cn("font-black text-sm leading-tight", isActive ? "text-primary" : "text-foreground")}>
          {benefitText}
        </p>
        {voucher.minimumCartSubtotal !== null && voucher.minimumCartSubtotal > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {locale === "vi" ? "Đơn tối thiểu" : "Min. order"}{" "}
            {formatPrice(voucher.minimumCartSubtotal, locale)}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              "text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-sm",
              isActive
                ? "bg-primary/10 text-primary"
                : "bg-muted/60 text-foreground/60"
            )}
          >
            {voucher.code}
          </span>
          {expiringSoon && (
            <span className="text-[9px] font-semibold text-destructive/80">
              {daysLeft === 0
                ? locale === "vi" ? "Hết hạn hôm nay" : "Expires today"
                : locale === "vi" ? `Còn ${daysLeft} ngày` : `${daysLeft}d left`}
            </span>
          )}
          {voucher.benefit.canCombine && (
            <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
              {locale === "vi" ? "Dùng cùng voucher khác" : "Stackable"}
            </span>
          )}
        </div>
        {!isEligible && (
          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
            {isCombinationBlocked
              ? locale === "vi"
                ? "Không thể dùng cùng voucher đang chọn"
                : "Cannot combine with the selected voucher"
              : locale === "vi"
                ? "Chưa đủ điều kiện áp dụng"
                : "Not eligible for your order"}
          </p>
        )}
      </div>

      {/* Radio indicator */}
      <div className="flex items-center pr-3 pl-1 shrink-0">
        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            isActive ? "border-primary bg-primary" : "border-border/60 bg-background"
          )}
        >
          {isActive && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

export function VoucherPickerDialog({
  open,
  onClose,
  subtotal,
  appliedCoupons,
  onApply,
  onRemove,
}: Props) {
  const locale = useLocale();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: rawVouchers, isLoading } = useQuery<{ vouchers: ActiveVoucher[] } | ActiveVoucher[]>({
    queryKey: ["active-vouchers"],
    queryFn: async () => {
      const response = await fetch("/api/vouchers/active");
      if (!response.ok) throw new Error("Failed to load vouchers");
      const data = await response.json();
      return data.vouchers || [];
    },
    enabled: open,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const vouchersList: ActiveVoucher[] = Array.isArray(rawVouchers)
    ? rawVouchers
    : Array.isArray((rawVouchers as any)?.vouchers)
    ? (rawVouchers as any).vouchers
    : [];

  useEffect(() => {
    if (open) {
      setSelectedCode(null);
    }
    setManualCode("");
    setError("");
  }, [open]);

  const shippingVouchers = vouchersList.filter((v) => v.benefit?.scope === "shipping");
  const discountVouchers = vouchersList.filter((v) => v.benefit?.scope === "cart");

  const isAppliedFn = (code: string) => appliedCoupons.some((c) => c.code === code);
  const isCombinationBlocked = (v: ActiveVoucher) =>
    appliedCoupons.length > 0 &&
    !isAppliedFn(v.code) &&
    (v.benefit.canCombine !== true || appliedCoupons.some((coupon) => !coupon.canCombine));
  const isEligible = (v: ActiveVoucher) => {
    if (v.minimumCartSubtotal !== null && subtotal < v.minimumCartSubtotal) return false;
    if (isCombinationBlocked(v)) return false;
    return true;
  };

  const handleApplySelected = async () => {
    const codeToApply = manualCode.trim().toUpperCase() || selectedCode;
    if (!codeToApply) return;

    if (isAppliedFn(codeToApply)) {
      onRemove(codeToApply);
      setSelectedCode(null);
      onClose();
      return;
    }

    setIsApplying(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToApply,
          subtotal,
          appliedCoupons: appliedCoupons.map((c) => c.code),
        }),
      });
      const data = await response.json();
      if (data.success) {
        onApply({
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          discountAmount: data.discountAmount,
          shippingDiscountAmount: data.shippingDiscountAmount,
          canCombine: data.coupon.canCombine,
        });
        setManualCode("");
        onClose();
      } else {
        setError(data.message || (locale === "vi" ? "Mã không hợp lệ" : "Invalid code"));
      }
    } catch {
      setError(locale === "vi" ? "Không thể áp dụng mã" : "Failed to apply code");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSelectVoucher = (code: string) => {
    setManualCode("");
    setError("");
    if (isAppliedFn(code)) {
      onRemove(code);
      setSelectedCode(null);
      return;
    }
    setSelectedCode((prev) => (prev === code ? null : code));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-[#faf9f7] dark:bg-neutral-950 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground leading-tight">
                {locale === "vi" ? "Chọn Voucher" : "Select Voucher"}
              </h2>
              {appliedCoupons.length > 0 && (
                <p className="text-[10px] text-primary font-semibold">
                  {appliedCoupons.length} {locale === "vi" ? "voucher đang dùng" : "applied"}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manual code input */}
        <div className="px-4 pb-3 shrink-0">
          <div className="flex gap-2 bg-white dark:bg-neutral-900 rounded-xl p-2 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            <Input
              ref={inputRef}
              placeholder={locale === "vi" ? "Nhập mã voucher..." : "Enter voucher code..."}
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value.toUpperCase());
                setError("");
                if (e.target.value) setSelectedCode(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleApplySelected()}
              className="h-9 text-xs font-mono tracking-widest border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={(!manualCode && !selectedCode) || isApplying}
              className="h-9 px-4 text-xs font-black uppercase tracking-widest rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {isApplying ? "..." : locale === "vi" ? "Áp dụng" : "Apply"}
            </button>
          </div>
          {error && (
            <p className="text-destructive text-[11px] mt-2 flex items-center gap-1 px-1">
              <AlertCircle className="w-3 h-3 shrink-0" /> {error}
            </p>
          )}
        </div>

        {/* Voucher list */}
        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[72px] rounded-xl bg-white dark:bg-neutral-900 shadow-[0_1px_6px_rgba(0,0,0,0.04)] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {shippingVouchers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3 h-3 text-primary/60" />
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                      {locale === "vi" ? "Ưu Đãi Vận Chuyển" : "Shipping Discounts"}
                    </p>
                  </div>
                  {shippingVouchers.map((v) => (
                    <VoucherCard
                      key={v.id}
                      voucher={v}
                      isSelected={selectedCode === v.code}
                      isApplied={isAppliedFn(v.code)}
                      isEligible={isEligible(v)}
                      isCombinationBlocked={isCombinationBlocked(v)}
                      locale={locale}
                      onSelect={() => handleSelectVoucher(v.code)}
                    />
                  ))}
                </div>
              )}

              {discountVouchers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-primary/60" />
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                      {locale === "vi" ? "Giảm Giá & Hoàn Xu" : "Discount & Cashback"}
                    </p>
                  </div>
                  {discountVouchers.map((v) => (
                    <VoucherCard
                      key={v.id}
                      voucher={v}
                      isSelected={selectedCode === v.code}
                      isApplied={isAppliedFn(v.code)}
                      isEligible={isEligible(v)}
                      isCombinationBlocked={isCombinationBlocked(v)}
                      locale={locale}
                      onSelect={() => handleSelectVoucher(v.code)}
                    />
                  ))}
                </div>
              )}

              {!isLoading && shippingVouchers.length === 0 && discountVouchers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/[0.06] flex items-center justify-center mb-3">
                    <Ticket className="w-6 h-6 text-primary/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/60">
                    {locale === "vi" ? "Không có voucher khả dụng" : "No vouchers available"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 mt-1">
                    {locale === "vi" ? "Nhập mã thủ công nếu bạn có mã voucher" : "Enter a code manually if you have one"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-border/40 shrink-0 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 text-sm font-semibold rounded-xl border border-border/60 bg-white dark:bg-neutral-900 text-foreground/70 hover:border-primary/30 hover:text-foreground transition-all"
          >
            {locale === "vi" ? "Trở lại" : "Back"}
          </button>
          <button
            type="button"
            onClick={handleApplySelected}
            disabled={(!selectedCode && !manualCode) || isApplying}
            className="flex-1 h-12 text-sm font-black uppercase tracking-widest rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all"
          >
            {isApplying ? "..." : locale === "vi" ? "Đồng ý" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
