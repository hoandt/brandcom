"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import Image from "next/image";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const router = useRouter();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<{ code: string; type: string; value: number; discountAmount: number }[]>([]);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleIncrement = (id: string, qty: number) => updateQuantity(id, qty + 1);
  const handleDecrement = (id: string, qty: number) => {
    if (qty <= 1) removeItem(id);
    else updateQuantity(id, qty - 1);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  let shippingFee = cartItems.length > 0 && subtotal < 100 ? 15.0 : 0.0; // Free shipping over $100
  let discount = 0;
  
  for (const coupon of appliedCoupons) {
    if (coupon.type === "FREE_SHIPPING") {
      shippingFee = 0;
    } else {
      discount += coupon.discountAmount;
    }
  }

  // Ensure discount doesn't exceed subtotal
  if (discount > subtotal) discount = subtotal;

  let totalAmount = subtotal + shippingFee - discount;
  if (totalAmount < 0) totalAmount = 0;
  
  let totalSavings = discount + (shippingFee === 0 && subtotal < 100 && cartItems.length > 0 ? 15 : 0);

  const applyCoupon = async () => {
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    
    try {
      const response = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: couponCode, 
          subtotal,
          appliedCoupons: appliedCoupons.map(c => c.code)
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setAppliedCoupons((prev) => [
          ...prev,
          {
            code: data.coupon.code,
            type: data.coupon.type,
            value: data.coupon.value,
            discountAmount: data.discountAmount
          }
        ]);
        setCouponCode("");
      } else {
        setCouponError(data.message || t("invalidCoupon"));
      }
    } catch (error) {
      setCouponError(t("failedToApply"));
    } finally {
      setIsApplyingCoupon(false);
    }
  };
  
  const removeCoupon = (code: string) => {
    setAppliedCoupons((prev) => prev.filter((c) => c.code !== code));
    setCouponError("");
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "Credit Card",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CheckoutFormValues) => {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          subtotal,
          shippingFee,
          totalAmount,
          items: cartItems,
          couponCodes: appliedCoupons.map((c) => c.code),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to place order");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setOrderPlaced(true);
      setOrderId(data.orderNumber);
      clearCart();
    },
  });

  const onSubmit = (data: CheckoutFormValues) => {
    if (cartItems.length === 0) return;
    mutation.mutate(data);
  };

  if (!isMounted) {
    return <div className="container mx-auto py-24 px-4 text-center">Loading cart...</div>;
  }

  if (orderPlaced) {
    return (
      <div className="container mx-auto py-24 px-4 flex flex-col items-center text-center max-w-lg">
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-4">{t("thankYou")}</h1>
        <p className="text-foreground/80 font-light mb-8">
          {t.rich("orderSuccess", { orderId, strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <Button className="rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 uppercase tracking-widest text-xs h-12 px-8 hover:bg-primary/90 transition-all" onClick={() => router.push(`/${locale}`)}>{t("returnToStore")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <div className="bg-background pt-8 pb-8 px-4 md:px-8 mb-4 sm:mb-8 border-b border-border/50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="text-xl md:text-2xl font-heading uppercase tracking-[0.1em]">{t("title")}</h1>
          <div className="w-9" /> {/* Spacer to center the title */}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-6 lg:gap-12">
          
          {/* Form Section */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-background p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] mb-6">
              <h2 className="text-sm font-heading uppercase tracking-widest border-b border-border pb-4 mb-6">{t("shippingInfo")}</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-widest">{t("fullName")}</label>
                  <Input {...register("customerName")} placeholder={t("fullNamePlaceholder")} className="h-12 bg-secondary/50 border-none rounded-xl" />
                  {errors.customerName && <p className="text-destructive text-xs mt-1">{errors.customerName.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium mb-2 uppercase tracking-widest">{t("phone")}</label>
                    <Input {...register("customerPhone")} placeholder={t("phonePlaceholder")} className="h-12 bg-secondary/50 border-none rounded-xl" />
                    {errors.customerPhone && <p className="text-destructive text-xs mt-1">{errors.customerPhone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 uppercase tracking-widest">{t("email")}</label>
                    <Input {...register("customerEmail")} placeholder={t("emailPlaceholder")} className="h-12 bg-secondary/50 border-none rounded-xl" />
                    {errors.customerEmail && <p className="text-destructive text-xs mt-1">{errors.customerEmail.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-widest">{t("shippingAddress")}</label>
                  <Input {...register("address")} placeholder={t("addressPlaceholder")} className="h-12 bg-secondary/50 border-none rounded-xl" />
                  {errors.address && <p className="text-destructive text-xs mt-1">{errors.address.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-widest">{t("paymentMethod")}</label>
                  <select
                    {...register("paymentMethod")}
                    className="h-12 w-full border-none bg-secondary/50 rounded-xl px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Credit Card">{t("creditCard")}</option>
                    <option value="Cash on Delivery">{t("cod")}</option>
                    <option value="PayPal">{t("paypal")}</option>
                  </select>
                  {errors.paymentMethod && <p className="text-destructive text-xs mt-1">{errors.paymentMethod.message}</p>}
                </div>

                <Button type="submit" className="w-full h-14 mt-8 text-xs tracking-widest uppercase transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg shadow-primary/20" disabled={mutation.isPending}>
                  {mutation.isPending ? t("processing") : t("completePurchase")}
                </Button>
                
                {mutation.isError && (
                  <p className="text-destructive text-xs text-center mt-4">{t("errorOrder")}</p>
                )}
              </form>
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            
            {/* Delivery estimate card */}
            <div className="bg-background p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
               <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shrink-0 text-foreground">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
               </div>
               <div>
                 <p className="font-bold text-sm">{t("deliveryEstimate")}</p>
                 <p className="text-xs text-muted-foreground mt-0.5">{t("shipmentOf", { count: cartItems.length })}</p>
               </div>
            </div>

            {/* Cart Items card */}
            <div className="bg-background p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
              {cartItems.length === 0 ? (
                <p className="text-muted-foreground font-light text-sm text-center py-4">{t("emptyBag")}</p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.variantId} className="flex gap-4 items-center">
                    {item.image && (
                      <div className="relative w-14 h-16 bg-secondary flex-shrink-0 rounded-md overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mb-1">{item.variantName}</p>
                      <p className="font-bold text-sm">${item.price.toFixed(2)}</p>
                    </div>
                    {/* Stepper inline */}
                    <div className="flex items-center bg-foreground text-background rounded-lg px-1 h-8 shrink-0">
                      <button onClick={() => handleDecrement(item.variantId, item.quantity)} className="w-6 h-full flex items-center justify-center font-medium opacity-80 hover:opacity-100">
                        <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10V2H0V0Z"/></svg>
                      </button>
                      <span className="text-xs font-bold min-w-[20px] text-center">{item.quantity}</span>
                      <button onClick={() => handleIncrement(item.variantId, item.quantity)} className="w-6 h-full flex items-center justify-center font-medium opacity-80 hover:opacity-100">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 0H6V4H10V6H6V10H4V6H0V4H4V0Z"/></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Coupon Section inside items card */}
              <div className="pt-5 border-t border-dashed border-border/50">
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder={t("promoCode")} 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={isApplyingCoupon || appliedCoupons.length >= 3}
                    className="h-10 text-xs bg-secondary/30 border-none rounded-lg"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={applyCoupon}
                    disabled={!couponCode || isApplyingCoupon || appliedCoupons.length >= 3}
                    className="h-10 px-4 text-xs tracking-widest uppercase rounded-full border-border hover:border-primary/50 hover:bg-primary/5 text-foreground hover:text-primary transition-colors"
                  >
                    {isApplyingCoupon ? "..." : t("apply")}
                  </Button>
                </div>
                {couponError && <p className="text-destructive text-xs mt-1 mb-2">{couponError}</p>}
                
                <div className="space-y-2 mt-3">
                  {appliedCoupons.map((coupon) => (
                    <div key={coupon.code} className="flex items-center justify-between bg-foreground/5 px-3 py-2 rounded-lg text-xs">
                      <span>{t.rich("codeApplied", { code: coupon.code, strong: (chunks) => <strong className="uppercase">{chunks}</strong> })}</span>
                      <button type="button" onClick={() => removeCoupon(coupon.code)} className="text-destructive font-medium underline hover:no-underline">{t("remove")}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill Details card */}
            <div className="bg-background p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
               <h3 className="font-bold text-sm mb-4">{t("billDetails")}</h3>
               <div className="space-y-3 text-xs">
                 <div className="flex justify-between">
                   <span className="flex items-center gap-2 text-muted-foreground">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> 
                     Items total
                   </span>
                   <span>${subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="flex items-center gap-2 text-muted-foreground">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> 
                     Delivery charge
                   </span>
                   <span>{shippingFee === 0 ? <span className="font-bold uppercase text-[10px] tracking-widest text-foreground">{t("free")}</span> : `$${shippingFee.toFixed(2)}`}</span>
                 </div>
                 {discount > 0 && (
                   <div className="flex justify-between">
                     <span className="flex items-center gap-2 text-muted-foreground">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                       Discount
                     </span>
                     <span>-${discount.toFixed(2)}</span>
                   </div>
                 )}
                 <div className="pt-4 mt-2 border-t border-dashed border-border flex justify-between font-bold text-sm">
                   <span>{t("grandTotal")}</span>
                   <span>${totalAmount.toFixed(2)}</span>
                 </div>
               </div>
               
               {/* Savings banner at bottom of card */}
               {totalSavings > 0 ? (
                 <div className="mt-5 bg-foreground text-background p-3 -mx-5 -mb-5 rounded-b-2xl flex justify-between items-center text-xs font-medium">
                   <span>{t("totalSavings")}</span>
                   <span>${totalSavings.toFixed(2)}</span>
                 </div>
               ) : null}
            </div>

            {/* Cancellation card */}
            <div className="bg-background p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
               <h3 className="font-bold text-sm mb-2">{t("cancellationPolicy")}</h3>
               <p className="text-xs text-muted-foreground leading-relaxed">
                 Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.
               </p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
