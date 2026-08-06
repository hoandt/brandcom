"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import Image from "next/image";
import Link from "next/link";
import {
  Trash2,
  Banknote,
  Check,
  ChevronRight,
  QrCode,
  Ticket,
  MapPin,
  Package,
  Tag,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Lock,
  RefreshCcw,
  BadgeCheck,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { AddressBook } from "@/components/checkout/address-book";
import { VoucherPickerDialog } from "@/components/checkout/voucher-picker-dialog";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  location: z.object(
    {
      province: z.any().optional(),
      district: z.any().optional(),
      ward: z.any().optional(),
    },
    { required_error: "Location is required" }
  ),
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, action }: { icon: React.ElementType; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-3 h-3 text-primary" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">{label}</span>
      </div>
      {action}
    </div>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [appliedCoupons, setAppliedCoupons] = useState<
    {
      code: string;
      type: string;
      value: number;
      discountAmount: number;
      shippingDiscountAmount: number;
      canCombine: boolean;
    }[]
  >([]);
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);

  const { data: savedAddresses = [], isLoading: isLoadingAddresses } = useQuery<unknown[]>({
    queryKey: ["user-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/user/addresses");
      if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    retry: false,
  });
  const { data: storeSettingsData } = useQuery<{ settings: { storeName: string; currency: string; fallbackShippingFee: number } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const storeName = storeSettingsData?.settings.storeName || "Store";
  const currency = storeSettingsData?.settings.currency;
  const fallbackShippingFee = storeSettingsData?.settings.fallbackShippingFee ?? 30000;

  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => { setIsMounted(true); }, []);

  const handleIncrement = (id: string, qty: number) => updateQuantity(id, qty + 1);
  const handleDecrement = (id: string, qty: number) => {
    if (qty <= 1) removeItem(id);
    else updateQuantity(id, qty - 1);
  };

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } =
    useForm<CheckoutFormValues>({
      resolver: zodResolver(checkoutSchema),
      mode: "onChange",
      defaultValues: { paymentMethod: "VNPAY" },
    });

  const locationWatch = watch("location");
  const addressWatch = watch("address");
  const customerNameWatch = watch("customerName");
  const customerPhoneWatch = watch("customerPhone");
  const spxMappings = locationWatch?.ward?.shipping_mappings?.spx;
  const firstSpxMapping = Array.isArray(spxMappings) ? spxMappings[0] : spxMappings;
  const canCalculateShipping = Boolean(
    locationWatch?.province &&
    (firstSpxMapping || locationWatch?.district) &&
    cartItems.length > 0
  );

  const { data: dynamicShippingFee, isLoading: isCalculatingShipping } = useQuery({
    queryKey: ["shipping-fee", firstSpxMapping, locationWatch?.district, addressWatch, cartItems],
    queryFn: async () => {
      if (!canCalculateShipping) {
        return 0;
      }

      let shippingLocation = firstSpxMapping;
      if (!shippingLocation && locationWatch?.province?.location_id && locationWatch?.ward?.location_id) {
        const wardsRes = await fetch(
          `/api/locations/wards?province_id=${encodeURIComponent(locationWatch.province.location_id)}`
        );
        if (wardsRes.ok) {
          const wardsJson = await wardsRes.json();
          const selectedWard = Array.isArray(wardsJson.data)
            ? wardsJson.data.find(
                (ward: { location_id?: string }) =>
                  ward.location_id === locationWatch.ward.location_id
              )
            : undefined;
          const mappings = selectedWard?.shipping_mappings?.spx;
          shippingLocation = Array.isArray(mappings) ? mappings[0] : mappings;
        }
      }

      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: shippingLocation
            ? {
                province: shippingLocation.province,
                district: shippingLocation.district,
                ward: shippingLocation.ward,
                detailAddress: addressWatch,
              }
            : { ...locationWatch, detailAddress: addressWatch },
          items: cartItems,
          recipient: {
            name: customerNameWatch,
            phone: customerPhoneWatch,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.fallbackFee || fallbackShippingFee;
      }
      const data = await res.json();
      return data.fee || fallbackShippingFee;
    },
    enabled: canCalculateShipping,
    staleTime: 1000 * 60 * 5,
  });

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // If user hasn't selected address, shipping is 0 to not charge them randomly, but we will prompt them.
  const baseShippingFee = dynamicShippingFee !== undefined ? dynamicShippingFee : 0;
  let shippingFee = baseShippingFee;
  let discount = 0;

  for (const coupon of appliedCoupons) {
    if (coupon.type === "FREE_SHIPPING") shippingFee = 0;
    else if (coupon.type === "SHIPPING_FIXED") {
      shippingFee = Math.max(0, shippingFee - coupon.shippingDiscountAmount);
    } else discount += coupon.discountAmount;
  }
  if (discount > subtotal) discount = subtotal;
  let totalAmount = subtotal + shippingFee - discount;
  if (totalAmount < 0) totalAmount = 0;

  const totalSavings = discount + Math.max(0, baseShippingFee - shippingFee);

  const removeCoupon = (code: string) =>
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));



  const handleSelectAddress = useCallback(
    (address: {
      id: string; name: string; phone: string; address: string;
      provinceId: string; provinceName: string;
      districtId: string; districtName: string;
      wardId: string; wardName: string;
    } | null) => {
      if (!address) {
        setValue("customerName", "", { shouldValidate: true });
        setValue("customerPhone", "", { shouldValidate: true });
        setValue("address", "", { shouldValidate: true });
        setValue("location", {}, { shouldValidate: true });
        return;
      }
      setValue("customerName", address.name, { shouldValidate: true });
      setValue("customerPhone", address.phone, { shouldValidate: true });
      setValue("address", address.address, { shouldValidate: true });
      setValue("location", {
        province: { location_id: address.provinceId, name: address.provinceName },
        district: { location_id: address.districtId, name: address.districtName },
        ward: { location_id: address.wardId, name: address.wardName },
      }, { shouldValidate: true });
    },
    [setValue]
  );

  const mutation = useMutation({
    mutationFn: async (data: CheckoutFormValues) => {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          subtotal,
          shippingFee: baseShippingFee,
          totalAmount,
          items: cartItems,
          couponCodes: appliedCoupons.map((c) => c.code),
        }),
      });
      if (!response.ok) throw new Error("Failed to place order");
      return response.json();
    },
    onSuccess: (data) => {
      clearCart();
      router.push(`/${locale}/account/orders/${data.orderId}`);
    },
  });

  const currentPaymentMethod = watch("paymentMethod") || "VNPAY";

  const paymentOptions = [
    {
      id: "vnpay", value: "VNPAY",
      label: locale === "vi" ? "Thanh toán QR" : "QR Code Payment",
      icon: QrCode,
      subtitle: locale === "vi" ? "VietQR / VNPAY-QR · 40+ ứng dụng ngân hàng" : "VietQR / VNPAY-QR · 40+ banking apps",
      accent: "from-primary/[0.06] to-primary/[0.02]",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      id: "cod", value: "Cash on Delivery",
      label: locale === "vi" ? "Thanh toán khi nhận hàng" : "Cash on Delivery",
      icon: Banknote,
      subtitle: locale === "vi" ? "Thanh toán tiền mặt khi nhận sản phẩm" : "Pay with cash when you receive your order",
      accent: "from-primary/[0.06] to-primary/[0.02]",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
  ];

  const onSubmit = (data: CheckoutFormValues) => {
    if (cartItems.length === 0) return;
    mutation.mutate(data);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#faf9f7] dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }



  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf9f7] dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
          <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-5" />
          <h1 className="text-xl font-heading uppercase tracking-widest mb-2">{t("emptyBag")}</h1>
          <p className="text-sm text-muted-foreground font-light mb-8">
            {locale === "vi" ? "Vui lòng thêm sản phẩm vào giỏ hàng để thanh toán." : "Please add some products to your cart to checkout."}
          </p>
          <Button
            className="w-full h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 uppercase tracking-widest text-xs hover:bg-primary/90 transition-all"
            onClick={() => router.push(`/${locale}`)}
          >
            {t("returnToStore")}
          </Button>
        </div>
      </div>
    );
  }

  const hasAddress = Boolean(watch("customerName") && watch("customerPhone") && watch("address"));
  const addressError = errors.customerName || errors.customerPhone || errors.address || errors.location;
  const needsDeliveryAddress = !isLoadingAddresses && savedAddresses.length === 0;

  const handleCheckoutAction = () => {
    if (needsDeliveryAddress) {
      setIsAddressBookOpen(true);
      return;
    }

    handleSubmit(onSubmit)();
  };

  const checkoutActionLabel = isLoadingAddresses
    ? locale === "vi"
      ? "Đang tải địa chỉ…"
      : "Loading addresses…"
    : needsDeliveryAddress
      ? locale === "vi"
        ? "Chọn địa chỉ giao hàng"
        : "Choose delivery address"
      : mutation.isPending
        ? t("processing")
        : t("completePurchase");

  const isCheckoutActionDisabled =
    mutation.isPending ||
    isLoadingAddresses ||
    (!needsDeliveryAddress && !isValid);

  // ── Trust badges data ─────────────────────────────────────────
  const trustBadges = [
    { icon: Lock, label: locale === "vi" ? "Thanh toán\nan toàn" : "Secure\npayments" },
    { icon: BadgeCheck, label: locale === "vi" ? "Bảo vệ\ndữ liệu" : "Data\nprivacy" },
    { icon: RefreshCcw, label: locale === "vi" ? "Hoàn tiền\n30 ngày" : "30-day\nrefund" },
    { icon: ShieldCheck, label: locale === "vi" ? "Đảm bảo\nchính hãng" : "Authentic\nguarantee" },
  ];

  // ── Reusable CTA button ───────────────────────────────────────
  const CtaButton = () => (
    <Button
      type="button"
      onClick={handleCheckoutAction}
      className="w-full h-14 text-sm font-black tracking-[0.12em] uppercase bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-xl shadow-primary/25 disabled:opacity-50 transition-all"
      disabled={isCheckoutActionDisabled}
    >
      {checkoutActionLabel}
    </Button>
  );

  return (
    <div className="min-h-screen bg-[#faf9f7] dark:bg-neutral-950 pb-32 lg:pb-12">

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="container max-w-5xl mx-auto flex items-center h-12 px-4 gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="flex-1 text-center text-[13px] font-bold tracking-widest uppercase">
            {locale === "vi" ? "Xác nhận đơn hàng" : "Order Confirmation"}
          </h1>
          <div className="shrink-0">
            <span className="text-xs font-black text-primary">{formatPrice(totalAmount, locale, currency)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Hidden inputs */}
        <input type="hidden" {...register("customerName")} />
        <input type="hidden" {...register("customerPhone")} />
        <input type="hidden" {...register("address")} />

        {/* Address book (headless) */}
        <AddressBook
          onSelectAddress={handleSelectAddress}
          open={isAddressBookOpen}
          onOpenChange={setIsAddressBookOpen}
          hasSelection={hasAddress}
          hideTrigger={true}
        />

        {/* ── Two-column grid (desktop) / single col (mobile) ── */}
        <div className="container max-w-5xl mx-auto px-3 pt-5 pb-5">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-4">

            {/* ══ LEFT COLUMN ══════════════════════════════════ */}
            <div className="space-y-3">

              {/* Address */}
              {isLoadingAddresses ? (
                <Section>
                  <div className="p-4 space-y-2 animate-pulse">
                    <div className="h-3.5 w-32 bg-muted/60 rounded-full" />
                    <div className="h-3 w-52 bg-muted/40 rounded-full" />
                  </div>
                </Section>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddressBookOpen(true)}
                  className={cn(
                    "w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex items-start gap-3 text-left transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] active:scale-[0.99]",
                    addressError && !hasAddress && "ring-2 ring-destructive/40"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", hasAddress ? "bg-primary/10" : "bg-muted/50")}>
                    <MapPin className={cn("w-3.5 h-3.5", hasAddress ? "text-primary" : "text-muted-foreground/50")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                      {locale === "vi" ? "Địa chỉ giao hàng" : "Shipping address"}
                    </p>
                    {hasAddress ? (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-foreground">{watch("customerName")}</span>
                          <span className="text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                            {watch("customerPhone")?.startsWith("0") ? `(+84) ${watch("customerPhone").slice(1)}` : watch("customerPhone")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {watch("address")}, {watch("location")?.ward?.name},{" "}
                          {watch("location")?.district?.name},{" "}
                          {watch("location")?.province?.name}
                        </p>
                      </>
                    ) : (
                      <p className={cn("text-sm font-semibold", addressError ? "text-destructive" : "text-muted-foreground")}>
                        {locale === "vi" ? "Thêm địa chỉ giao hàng" : "Add an address"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {hasAddress && (
                      <span className="text-[11px] font-semibold text-primary">
                        {locale === "vi" ? "Thay đổi" : "Change"}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              )}

              {/* Items */}
              <Section>
                <SectionHeader
                  icon={Package}
                  label={locale === "vi" ? "Sản phẩm" : `Shipped by ${storeName}`}
                  action={
                    <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                      {cartItemCount} {locale === "vi" ? "sp" : cartItemCount === 1 ? "item" : "items"}
                    </span>
                  }
                />
                <div className="divide-y divide-border/30">
                  {cartItems.map((item) => (
                    <div key={item.variantId} className="flex items-start gap-3 px-4 py-3">
                      <Link href={item.productSlug ? `/${locale}/products/${item.productSlug}` : "#"} className="shrink-0">
                        <div className="relative w-16 h-16 bg-muted/40 rounded-xl overflow-hidden ring-1 ring-black/5">
                          {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" />}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-foreground leading-snug line-clamp-2">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.variantName}</p>
                        <div className="flex items-baseline gap-2 mt-1.5">
                          <span className="font-bold text-sm text-foreground">
                            {formatPrice(item.price * item.quantity, locale, currency)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              × {item.quantity} @ {formatPrice(item.price, locale, currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center bg-foreground text-background rounded-xl h-8 overflow-hidden">
                          <button type="button" onClick={() => handleDecrement(item.variantId, item.quantity)}
                            className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors text-lg font-light">−</button>
                          <span className="text-xs font-bold min-w-[22px] text-center">{item.quantity}</span>
                          <button type="button" onClick={() => handleIncrement(item.variantId, item.quantity)}
                            className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors text-base font-light">+</button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.variantId)}
                          className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors rounded-full hover:bg-destructive/5"
                          aria-label="Remove item">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping pill */}
                <div className="mx-4 mb-4 mt-1">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold",
                    shippingFee === 0 && dynamicShippingFee !== undefined
                      ? "bg-primary/[0.06] text-primary"
                      : "bg-muted/60 text-foreground/60"
                  )}>
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    {isCalculatingShipping ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin" />
                        {locale === "vi" ? "Đang tính phí vận chuyển..." : "Calculating shipping..."}
                      </span>
                    ) : shippingFee === 0 && dynamicShippingFee !== undefined
                      ? (locale === "vi" ? "🎉 Miễn phí vận chuyển" : "🎉 Free shipping applied")
                      : (locale === "vi"
                        ? (dynamicShippingFee === undefined ? "Vui lòng chọn địa chỉ để tính phí vận chuyển" : `Phí vận chuyển ${formatPrice(shippingFee, locale, currency)}`)
                        : (dynamicShippingFee === undefined ? "Please select an address to calculate shipping" : `Shipping ${formatPrice(shippingFee, locale, currency)}`))}
                  </div>
                </div>
              </Section>

              {/* Payment Method (left col, hidden on desktop — shown in right col) */}
              <Section className="lg:hidden">
                <SectionHeader icon={QrCode} label={t("paymentMethod")} />
                <div className="px-3 pb-3 space-y-2">
                  {paymentOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = currentPaymentMethod === opt.value;
                    return (
                      <button key={opt.id} type="button"
                        onClick={() => setValue("paymentMethod", opt.value, { shouldValidate: true, shouldDirty: true })}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                          isActive ? "border-primary bg-gradient-to-r " + opt.accent : "border-transparent bg-muted/40 hover:bg-muted/70"
                        )}>
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isActive ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", opt.iconBg)}>
                          <Icon className={cn("w-4 h-4", opt.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold leading-tight", isActive ? "text-foreground" : "text-foreground/80")}>{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{opt.subtitle}</p>
                        </div>
                        {isActive && <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" value={currentPaymentMethod} {...register("paymentMethod")} />
              </Section>

              {/* Mobile voucher row */}
              <button type="button" onClick={() => setIsVoucherDialogOpen(true)}
                className="lg:hidden w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-4 py-3.5 flex items-center gap-3 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-all active:scale-[0.99] text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Ticket className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {appliedCoupons.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {appliedCoupons.map((c) => (
                        <span key={c.code} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">
                          <Tag className="w-2.5 h-2.5" />
                          {c.code}
                          <span className="opacity-70 font-medium">
                            {c.type === "FREE_SHIPPING"
                              ? locale === "vi" ? " · Freeship" : " · Free ship"
                              : c.type === "SHIPPING_FIXED"
                                ? locale === "vi"
                                  ? ` · -${formatPrice(c.shippingDiscountAmount, locale, currency)} phí ship`
                                  : ` · -${formatPrice(c.shippingDiscountAmount, locale, currency)} shipping`
                                : ` · -${formatPrice(c.discountAmount, locale, currency)}`}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-foreground">{locale === "vi" ? "Chọn voucher" : "Deals"}</p>
                      <p className="text-[11px] text-muted-foreground">{locale === "vi" ? "Nhập mã hoặc chọn từ danh sách" : "No available deals"}</p>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>

            </div>{/* end left col */}

            {/* ══ RIGHT COLUMN ═════════════════════════════════ */}
            <div className="space-y-3">

              {/* Desktop: Voucher/Deals */}
              <button type="button" onClick={() => setIsVoucherDialogOpen(true)}
                className="hidden lg:flex w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-4 py-3.5 items-center gap-3 hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-all active:scale-[0.99] text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Ticket className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 mb-0.5">
                    {locale === "vi" ? "Voucher & Ưu đãi" : "Deals"}
                  </p>
                  {appliedCoupons.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {appliedCoupons.map((c) => (
                        <span key={c.code} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">
                          <Tag className="w-2.5 h-2.5" />
                          {c.code}
                          <span className="opacity-70 font-medium">
                            {c.type === "FREE_SHIPPING"
                              ? locale === "vi" ? " · Freeship" : " · Free ship"
                              : c.type === "SHIPPING_FIXED"
                                ? locale === "vi"
                                  ? ` · -${formatPrice(c.shippingDiscountAmount, locale, currency)} phí ship`
                                  : ` · -${formatPrice(c.shippingDiscountAmount, locale, currency)} shipping`
                                : ` · -${formatPrice(c.discountAmount, locale, currency)}`}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">
                      {locale === "vi" ? "Chưa có voucher nào" : "No available deals"}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>

              {/* Order Summary */}
              <Section>
                <SectionHeader icon={Sparkles} label={locale === "vi" ? "Tóm tắt đơn hàng" : "Order summary"} />
                <div className="px-4 pb-4 space-y-2.5 text-[13px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{locale === "vi" ? "Tổng tiền hàng" : "Item subtotal"}</span>
                    <span className="font-medium">{formatPrice(subtotal, locale, currency)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{locale === "vi" ? "Giảm giá" : "Discounts"}</span>
                      <span className="font-bold text-primary">−{formatPrice(discount, locale, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{locale === "vi" ? "Phí vận chuyển" : "Shipping"}</span>
                    {isCalculatingShipping ? (
                      <span className="w-3 h-3 border-2 border-primary border-r-transparent rounded-full animate-spin" />
                    ) : shippingFee === 0 && dynamicShippingFee !== undefined ? (
                      <span className="font-bold text-primary text-[11px] uppercase tracking-widest">{t("free")}</span>
                    ) : dynamicShippingFee === undefined ? (
                      <span className="font-medium text-[11px] text-muted-foreground">{locale === "vi" ? "Chưa tính" : "Not calculated"}</span>
                    ) : (
                      <span className="font-medium">{formatPrice(shippingFee, locale, currency)}</span>
                    )}
                  </div>

                  <div className="border-t border-border/50 pt-3 flex justify-between items-end">
                    <span className="font-black text-sm text-foreground">
                      {locale === "vi" ? `Tổng (${cartItemCount} sp)` : `Total (${cartItemCount} ${cartItemCount === 1 ? "item" : "items"})`}
                    </span>
                    <span className="font-black text-xl text-primary">{formatPrice(totalAmount, locale, currency)}</span>
                  </div>

                  {totalSavings > 0 && (
                    <p className="text-[11px] text-primary/70 font-semibold text-right">
                      {locale === "vi" ? `Tiết kiệm ${formatPrice(totalSavings, locale, currency)}` : `Saved ${formatPrice(totalSavings, locale, currency)}`}
                    </p>
                  )}
                </div>
              </Section>

              {/* Desktop: Payment Method */}
              <Section className="hidden lg:block">
                <SectionHeader icon={QrCode} label={t("paymentMethod")} />
                <div className="px-3 pb-3 space-y-2">
                  {paymentOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = currentPaymentMethod === opt.value;
                    return (
                      <button key={opt.id} type="button"
                        onClick={() => setValue("paymentMethod", opt.value, { shouldValidate: true, shouldDirty: true })}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                          isActive ? "border-primary bg-gradient-to-r " + opt.accent : "border-transparent bg-muted/40 hover:bg-muted/70"
                        )}>
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", isActive ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", opt.iconBg)}>
                          <Icon className={cn("w-4 h-4", opt.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold leading-tight", isActive ? "text-foreground" : "text-foreground/80")}>{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{opt.subtitle}</p>
                        </div>
                        {isActive && <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" value={currentPaymentMethod} {...register("paymentMethod")} />
              </Section>

              {/* Desktop CTA */}
              <div className="hidden lg:block">
                <CtaButton />
                {mutation.isError && <p className="text-destructive text-xs text-center mt-3">{t("errorOrder")}</p>}
              </div>

              {/* Trust Badges — TikTok Shop style */}
              <Section className="hidden lg:block">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/70">
                    {locale === "vi" ? `Bảo vệ đơn hàng ${storeName}` : `${storeName} Protections`}
                  </span>
                  <button type="button" className="text-[11px] text-primary font-semibold hover:underline">
                    {locale === "vi" ? "Xem tất cả" : "View all"}
                  </button>
                </div>
                <div className="px-4 pb-4 grid grid-cols-4 gap-3">
                  {trustBadges.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground/60" />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium leading-tight whitespace-pre-line">{label}</p>
                    </div>
                  ))}
                </div>
              </Section>

            </div>{/* end right col */}

          </div>{/* end grid */}

          {/* Mobile: trust badges */}
          <div className="lg:hidden mt-3">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/70">
                  {locale === "vi" ? "Bảo vệ đơn hàng" : `${storeName} Protections`}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground/60" />
                    </div>
                    <p className="text-[9px] text-muted-foreground font-medium leading-tight whitespace-pre-line">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </form>

      {/* ── Mobile Sticky CTA ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] text-muted-foreground font-medium">
              {locale === "vi" ? `Tổng · ${cartItemCount} sp` : `Total · ${cartItemCount} items`}
            </span>
            <div className="text-right">
              <span className="font-black text-lg text-primary leading-none">{formatPrice(totalAmount, locale, currency)}</span>
              {totalSavings > 0 && (
                <p className="text-[10px] text-primary/60 font-semibold">
                  {locale === "vi" ? "Tiết kiệm" : "Saved"} {formatPrice(totalSavings, locale, currency)}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            onClick={handleCheckoutAction}
            className="w-full h-13 text-sm font-black tracking-[0.1em] uppercase bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all"
            disabled={isCheckoutActionDisabled}
          >
            {checkoutActionLabel}
          </Button>
          {mutation.isError && <p className="text-destructive text-xs text-center mt-2">{t("errorOrder")}</p>}
        </div>
      </div>

      <VoucherPickerDialog
        open={isVoucherDialogOpen}
        onClose={() => setIsVoucherDialogOpen(false)}
        subtotal={subtotal}
        appliedCoupons={appliedCoupons}
        onApply={(coupon) =>
          setAppliedCoupons((prev) => {
            if (prev.some((c) => c.code === coupon.code)) return prev;
            return [...prev, coupon];
          })
        }
        onRemove={removeCoupon}
      />
    </div>
  );
}
