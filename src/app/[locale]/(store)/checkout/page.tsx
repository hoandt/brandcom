"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  List,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { AddressBook } from "@/components/checkout/address-book";
import { VoucherPickerDialog } from "@/components/checkout/voucher-picker-dialog";
import { ZaloLoginDialog } from "@/components/auth/zalo-login-dialog";

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

type ShippingCarrier = {
  id: string;
  name: string;
  serviceType: number;
};

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
  const zaloT = useTranslations("ZaloLogin");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isZaloLoginOpen, setIsZaloLoginOpen] = useState(false);
  const [hasPromptedZaloLogin, setHasPromptedZaloLogin] = useState(false);

  const {
    data: savedAddresses = [],
    isLoading: isLoadingAddresses,
    isError: isAddressQueryError,
    error: addressQueryError,
    refetch: refetchAddresses,
  } = useQuery<unknown[]>({
    queryKey: ["user-addresses"],
    queryFn: async () => {
      const res = await fetch("/api/user/addresses");
      if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const isAddressUnauthorized =
    isAddressQueryError &&
    addressQueryError instanceof Error &&
    addressQueryError.message === "Unauthorized";
  const { data: storeSettingsData } = useQuery<{
    settings: {
      storeName: string;
      currency: string;
      fallbackShippingFee: number;
      nonCodDiscountEnabled?: boolean;
      nonCodDiscountType?: "percentage" | "fixed_amount";
      nonCodDiscountValue?: number;
    };
  }>({
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

  const {
    data: shippingCarriers = [],
    isLoading: isLoadingCarriers,
    isError: isCarrierError,
  } = useQuery<ShippingCarrier[]>({
    queryKey: ["shipping-carriers"],
    queryFn: async () => {
      const response = await fetch("/api/shipping/carriers");
      if (!response.ok) throw new Error("Failed to load shipping carriers");
      const data = await response.json();
      return Array.isArray(data.carriers) ? data.carriers : [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (shippingCarriers.length === 0) {
      setSelectedCarrier("");
      return;
    }

    if (!shippingCarriers.some((carrier) => carrier.id === selectedCarrier)) {
      setSelectedCarrier(shippingCarriers[0].id);
    }
  }, [selectedCarrier, shippingCarriers]);

  const selectedCarrierSettings = shippingCarriers.find((carrier) => carrier.id === selectedCarrier);

  const cartItems = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (
      locale === "vi" &&
      isAddressUnauthorized &&
      !hasPromptedZaloLogin
    ) {
      setIsZaloLoginOpen(true);
      setHasPromptedZaloLogin(true);
    }
  }, [hasPromptedZaloLogin, isAddressUnauthorized, locale]);

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
  const canCalculateShipping = Boolean(
    locationWatch?.province && locationWatch?.ward &&
    cartItems.length > 0 && selectedCarrier
  );

  const currentPaymentMethod = watch("paymentMethod") || "VNPAY";
  const isCod = currentPaymentMethod === "Cash on Delivery" || currentPaymentMethod === "COD";
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const provinceKey = locationWatch?.province?.location_id || locationWatch?.province?.name || "";
  const districtKey = locationWatch?.district?.location_id || locationWatch?.district?.name || "";
  const wardKey = locationWatch?.ward?.location_id || locationWatch?.ward?.name || "";
  const totalCartQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const { data: shippingQueryResult, isLoading: isCalculatingShipping } = useQuery({
    queryKey: ["shipping-fee", selectedCarrier, provinceKey, districtKey, wardKey, totalCartQuantity, isCod],
    queryFn: async () => {
      if (!canCalculateShipping) {
        return { fee: 0, carrier: selectedCarrier };
      }

      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            province: locationWatch.province,
            district: locationWatch.district,
            ward: locationWatch.ward,
            provinceId: locationWatch.province?.location_id,
            districtId: locationWatch.district?.location_id,
            wardId: locationWatch.ward?.location_id,
            detailAddress: addressWatch,
          },
          items: cartItems,
          recipient: {
            name: customerNameWatch,
            phone: customerPhoneWatch,
          },
          carrier: selectedCarrier,
          isCod,
          codAmount: subtotal,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { fee: err.fallbackFee || fallbackShippingFee, carrier: err.carrier || selectedCarrier };
      }
      const data = await res.json();
      return {
        fee: data.fee || fallbackShippingFee,
        carrier: data.carrier || selectedCarrier,
        serviceType: data.serviceType,
        parcel: data.parcel,
      };
    },
    enabled: canCalculateShipping,
    staleTime: 1000 * 60 * 5,
  });

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const dynamicShippingFee = shippingQueryResult?.fee;
  const baseShippingFee = dynamicShippingFee !== undefined ? dynamicShippingFee : fallbackShippingFee;

  let currentShippingFee = baseShippingFee;
  let cartDiscount = 0;

  const appliedCouponsWithDetails = appliedCoupons.map((coupon) => {
    let effectiveDiscount = 0;
    if (coupon.type === "FREE_SHIPPING") {
      effectiveDiscount = currentShippingFee;
      currentShippingFee = 0;
    } else if (coupon.type === "SHIPPING_FIXED") {
      const targetDisc = coupon.shippingDiscountAmount > 0 ? coupon.shippingDiscountAmount : (coupon.value || 0);
      effectiveDiscount = Math.min(currentShippingFee, targetDisc);
      currentShippingFee = Math.max(0, currentShippingFee - effectiveDiscount);
    } else {
      const targetDisc = coupon.discountAmount > 0 ? coupon.discountAmount : (coupon.value || 0);
      effectiveDiscount = Math.min(subtotal - cartDiscount, targetDisc);
      cartDiscount += effectiveDiscount;
    }
    return {
      ...coupon,
      effectiveDiscount,
    };
  });

  const shippingFee = currentShippingFee;
  const discount = cartDiscount;

  const { data: activeVouchersData } = useQuery({
    queryKey: ["active-vouchers"],
    queryFn: async () => {
      const res = await fetch("/api/vouchers/active");
      if (!res.ok) return { vouchers: [] };
      return res.json();
    },
    staleTime: 60_000,
  });

  const rawActiveVouchers = Array.isArray(activeVouchersData)
    ? activeVouchersData
    : Array.isArray((activeVouchersData as any)?.vouchers)
      ? (activeVouchersData as any).vouchers
      : [];

  const activePaymentVouchers = rawActiveVouchers.filter(
    (v: any) => v.benefit?.scope === "payment"
  );

  const currentPaymentVoucher = activePaymentVouchers.find((v: any) => {
    const b = v.benefit;
    if (!b) return false;
    if (v.minimumCartSubtotal && subtotal < v.minimumCartSubtotal) return false;
    const target = b.paymentMethod || "all_online";
    if (target === "all_online") return !isCod;
    if (target === "cod") return isCod;
    if (target === "vnpay") return currentPaymentMethod === "VNPAY" || !isCod;
    return true;
  });

  let paymentMethodDiscount = 0;
  let paymentDiscountName = "";
  if (currentPaymentVoucher) {
    const b = currentPaymentVoucher.benefit;
    const isPct = b.type === "percentage";
    paymentDiscountName = isPct ? `${currentPaymentVoucher.name} (-${b.value}%)` : currentPaymentVoucher.name;
    if (b.type === "percentage") {
      paymentMethodDiscount = Math.round((subtotal * (b.value || 0)) / 100);
      if (b.maxDiscountAmount) paymentMethodDiscount = Math.min(paymentMethodDiscount, b.maxDiscountAmount);
    } else if (b.type === "fixed_amount") {
      paymentMethodDiscount = Math.min(subtotal, b.value || 0);
    }
  } else if (!isCod && storeSettingsData?.settings?.nonCodDiscountEnabled) {
    const nonCodType = storeSettingsData?.settings?.nonCodDiscountType ?? "percentage";
    const nonCodValue = storeSettingsData?.settings?.nonCodDiscountValue ?? 5;
    if (nonCodValue > 0) {
      const baseName = locale === "vi" ? "QR" : "QR";
      paymentDiscountName = nonCodType === "percentage" ? `${baseName} (-${nonCodValue}%)` : baseName;
      if (nonCodType === "percentage") {
        paymentMethodDiscount = Math.round((subtotal * nonCodValue) / 100);
      } else {
        paymentMethodDiscount = Math.min(subtotal, nonCodValue);
      }
    }
  }

  const totalDiscount = discount + paymentMethodDiscount;
  let totalAmount = subtotal + shippingFee - totalDiscount;
  if (totalAmount < 0) totalAmount = 0;

  const totalSavings = totalDiscount + Math.max(0, baseShippingFee - shippingFee);

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
        setSelectedAddressId(null);
        setValue("customerName", "", { shouldValidate: true });
        setValue("customerPhone", "", { shouldValidate: true });
        setValue("address", "", { shouldValidate: true });
        setValue("location", {}, { shouldValidate: true });
        return;
      }
      setSelectedAddressId(address.id);
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
      const shippingCarrier = selectedCarrier || shippingQueryResult?.carrier;
      const shippingParams = {
        carrier: shippingCarrier,
        serviceType: shippingQueryResult?.serviceType || 1,
        parcel: shippingQueryResult?.parcel || {
          weight: 200,
          length: 10,
          width: 10,
          height: 10,
        },
        location: data.location,
        recipient: {
          name: data.customerName,
          phone: data.customerPhone,
        },
        address: data.address,
        paymentMethod: data.paymentMethod,
        isCod: data.paymentMethod === "Cash on Delivery",
        codAmount: totalAmount,
      };

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
          shippingCarrier,
          shippingParams,
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
  const needsDeliveryAddress =
    !isLoadingAddresses &&
    !isAddressUnauthorized &&
    savedAddresses.length === 0;

  const handleAuthenticationRequired = () => {
    if (locale === "vi") {
      setIsZaloLoginOpen(true);
      return;
    }

    router.push(`/${locale}/login?redirectTo=/${locale}/checkout`);
  };

  const handleAddressAction = () => {
    if (isAddressUnauthorized) {
      handleAuthenticationRequired();
      return;
    }

    setIsAddressBookOpen(true);
  };

  const handleCheckoutAction = () => {
    if (isAddressUnauthorized) {
      handleAuthenticationRequired();
      return;
    }

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
    : isAddressUnauthorized
      ? locale === "vi"
        ? zaloT("checkoutAction")
        : zaloT("emailLogin")
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
    isLoadingCarriers ||
    isCarrierError ||
    shippingCarriers.length === 0 ||
    (!isAddressUnauthorized && !needsDeliveryAddress && !isValid);

  // ── Trust badges data ─────────────────────────────────────────
  const trustBadges = [
    { icon: Lock, label: locale === "vi" ? "Thanh toán\nan toàn" : "Secure\npayments" },
    { icon: BadgeCheck, label: locale === "vi" ? "Bảo vệ\ndữ liệu" : "Data\nprivacy" },
    { icon: RefreshCcw, label: locale === "vi" ? "Hoàn tiền\ndễ dàng" : "30-day\nrefund" },
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



      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Hidden inputs */}
        <input type="hidden" {...register("customerName")} />
        <input type="hidden" {...register("customerPhone")} />
        <input type="hidden" {...register("address")} />

        {/* Address book (headless) */}
        {!isAddressUnauthorized && (
          <AddressBook
            onSelectAddress={handleSelectAddress}
            selectedAddressId={selectedAddressId}
            open={isAddressBookOpen}
            onOpenChange={setIsAddressBookOpen}
            hasSelection={hasAddress}
            hideTrigger={true}
          />
        )}

        {/* ── Two-column grid (desktop) / single col (mobile) ── */}
        <div className="container max-w-5xl mx-auto px-3 pt-5 pb-5">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-4">

            {/* ══ LEFT COLUMN (Amazon-style Sequential Steps) ════ */}
            <div className="flex flex-col gap-3">

              {/* Step 1: Address */}
              {isLoadingAddresses ? (
                <Section className="order-1">
                  <div className="p-4 space-y-2 animate-pulse">
                    <div className="h-3.5 w-32 bg-muted/60 rounded-full" />
                    <div className="h-3 w-52 bg-muted/40 rounded-full" />
                  </div>
                </Section>
              ) : (
                <button
                  type="button"
                  onClick={handleAddressAction}
                  className={cn(
                    "order-1 w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex items-start gap-3 text-left transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] active:scale-[0.99]",
                    addressError && !hasAddress && "ring-2 ring-destructive/40"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", hasAddress ? "bg-primary/10" : "bg-muted/50")}>
                    <MapPin className={cn("w-3.5 h-3.5", hasAddress ? "text-primary" : "text-muted-foreground/50")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">
                      {locale === "vi" ? "1. Địa chỉ giao hàng" : "1. Shipping address"}
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
                    ) : isAddressUnauthorized ? (
                      <p className="text-sm font-semibold text-primary">
                        {zaloT("addressPrompt")}
                      </p>
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

              {/* Step 4: Payment Method */}
              <Section className="order-4">
                <SectionHeader icon={QrCode} label={locale === "vi" ? "4. Phương thức thanh toán" : "4. Payment method"} />
                <div className="px-3 pb-3 space-y-2">
                  {paymentOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = currentPaymentMethod === opt.value;
                    const isOptionCod = opt.value === "Cash on Delivery" || opt.value === "COD";
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
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm font-bold leading-tight", isActive ? "text-foreground" : "text-foreground/80")}>{opt.label}</p>
                            {paymentMethodDiscount > 0 && ((!isOptionCod && (!currentPaymentVoucher || currentPaymentVoucher.benefit?.paymentMethod !== "cod")) || (isOptionCod && currentPaymentVoucher?.benefit?.paymentMethod === "cod")) && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-none border border-primary/20">
                                🎉 {locale === "vi" ? `Giảm ${paymentDiscountName ? paymentDiscountName : "ưu đãi"}` : "Discount applied"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{opt.subtitle}</p>
                          {isOptionCod && !paymentMethodDiscount && (
                            <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">
                              {locale === "vi" ? "Thanh toán tiền mặt (Không áp dụng ưu đãi giảm giá)" : "Cash payment (Ineligible for online discount)"}
                            </p>
                          )}
                        </div>
                        {isActive && <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" strokeWidth={3} /></div>}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" value={currentPaymentMethod} {...register("paymentMethod")} />
              </Section>

              {/* Step 3: Shipping Carrier Selection */}
              <Section className="order-3">
                <SectionHeader
                  icon={Truck}
                  label={locale === "vi" ? "3. Đơn vị vận chuyển" : "3. Shipping carrier"}
                />
                <div className="px-3 pb-3 space-y-2">
                  {isLoadingCarriers ? (
                    <div className="h-[72px] animate-pulse rounded-xl bg-muted/40" />
                  ) : isCarrierError ? (
                    <p className="rounded-xl bg-destructive/5 p-3 text-xs font-medium text-destructive">
                      {locale === "vi" ? "Không thể tải đơn vị vận chuyển." : "Unable to load shipping carriers."}
                    </p>
                  ) : shippingCarriers.length === 0 ? (
                    <p className="rounded-xl bg-muted/40 p-3 text-xs font-medium text-muted-foreground">
                      {locale === "vi" ? "Hiện chưa có đơn vị vận chuyển nào được bật." : "No shipping carriers are currently enabled."}
                    </p>
                  ) : shippingCarriers.map((carrier) => {
                    const isActive = selectedCarrier === carrier.id;
                    return (
                      <button
                        key={carrier.id}
                        type="button"
                        onClick={() => setSelectedCarrier(carrier.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                          isActive
                            ? "border-primary bg-gradient-to-r from-primary/[0.06] to-primary/[0.02]"
                            : "border-transparent bg-muted/40 hover:bg-muted/70"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            isActive ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}
                        >
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                          <Truck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-bold leading-tight", isActive ? "text-foreground" : "text-foreground/80")}>
                            {carrier.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {locale === "vi" ? `Dịch vụ vận chuyển loại ${carrier.serviceType}` : `Shipping service type ${carrier.serviceType}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {isCalculatingShipping ? (
                            <span className="w-3 h-3 border-2 border-primary border-r-transparent rounded-full animate-spin inline-block" />
                          ) : baseShippingFee === 0 && dynamicShippingFee !== undefined ? (
                            <span className="text-[11px] font-bold text-primary uppercase">{t("free")}</span>
                          ) : dynamicShippingFee === undefined ? (
                            <span className="text-[11px] text-muted-foreground font-medium">{locale === "vi" ? "Chưa tính" : "Not calculated"}</span>
                          ) : (
                            <span className="text-xs font-bold text-foreground">{formatPrice(baseShippingFee, locale, currency)}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Step 2: Items */}
              <Section className="order-2">
                <SectionHeader
                  icon={Package}
                  label={locale === "vi" ? "2. Xem lại sản phẩm" : `2. Review items (${storeName})`}
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
              </Section>

            </div>{/* end left col */}

            {/* ══ RIGHT COLUMN (Amazon-style Sticky Summary Sidebar) ══ */}
            <div className="lg:sticky lg:top-28 self-start space-y-3">

              {/* Order Summary Card */}
              <Section>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">
                      {locale === "vi" ? "Tóm tắt đơn hàng" : "Order summary"}
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full">
                      {cartItemCount} {locale === "vi" ? "sp" : cartItemCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="border-t border-border/40 pt-4 space-y-3 text-[13px]">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{locale === "vi" ? "Tổng tiền hàng" : "Item subtotal"}</span>
                      <span className="font-medium">{formatPrice(subtotal, locale, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {locale === "vi"
                          ? `Phí vận chuyển (${selectedCarrierSettings?.name ?? "—"})`
                          : `Shipping (${selectedCarrierSettings?.name ?? "—"})`}
                      </span>
                      {isCalculatingShipping ? (
                        <span className="w-3 h-3 border-2 border-primary border-r-transparent rounded-full animate-spin" />
                      ) : baseShippingFee === 0 && dynamicShippingFee !== undefined ? (
                        <span className="font-bold text-primary text-[11px] uppercase tracking-widest">{t("free")}</span>
                      ) : dynamicShippingFee === undefined ? (
                        <span className="font-medium text-[11px] text-muted-foreground">{locale === "vi" ? "Chưa tính" : "Not calculated"}</span>
                      ) : (
                        <span className="font-medium">{formatPrice(baseShippingFee, locale, currency)}</span>
                      )}
                    </div>
                    {appliedCouponsWithDetails.map((coupon) => (
                      <div key={coupon.code} className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span>{locale === "vi" ? `Giảm giá voucher (${coupon.code})` : `Voucher discount (${coupon.code})`}</span>
                          <button
                            type="button"
                            onClick={() => removeCoupon(coupon.code)}
                            className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
                            title={locale === "vi" ? "Bỏ áp dụng" : "Remove coupon"}
                          >
                            ×
                          </button>
                        </span>
                        <span className="font-bold text-primary">−{formatPrice(coupon.effectiveDiscount, locale, currency)}</span>
                      </div>
                    ))}
                    {paymentMethodDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {locale === "vi" ? `Ưu đãi thanh toán ${paymentDiscountName}` : `Payment discount ${paymentDiscountName}`}
                        </span>
                        <span className="font-bold text-primary">−{formatPrice(paymentMethodDiscount, locale, currency)}</span>
                      </div>
                    )}
                    {/* Voucher & Deals trigger row */}
                    <button
                      type="button"
                      onClick={() => setIsVoucherDialogOpen(true)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                            {locale === "vi" ? "Voucher & Ưu đãi" : "Deals & Vouchers"}
                          </p>
                          {appliedCoupons.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {appliedCoupons.map((c) => (
                                <span key={c.code} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  <Tag className="w-2.5 h-2.5" />
                                  {c.code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground font-medium">
                              {locale === "vi" ? "Chưa có voucher nào" : "No available deals"}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                    </button>

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

                    <div className="hidden lg:block border-t border-border/50 pt-4 space-y-2">
                      <CtaButton />
                      {mutation.isError && <p className="text-destructive text-xs text-center">{t("errorOrder")}</p>}
                      <p className="text-[10px] text-muted-foreground/70 text-center font-medium leading-tight">
                        {locale === "vi" ? "Bằng việc đặt hàng, bạn đồng ý với Điều khoản mua hàng của store" : "By placing your order, you agree to store terms"}
                      </p>
                    </div>
                  </div>
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

      {locale === "vi" && (
        <ZaloLoginDialog
          open={isZaloLoginOpen}
          onOpenChange={setIsZaloLoginOpen}
          showPasswordLogin
          onSuccess={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["user-addresses"],
            });
            await refetchAddresses();
            router.refresh();
            setIsAddressBookOpen(true);
          }}
        />
      )}
    </div>
  );
}
