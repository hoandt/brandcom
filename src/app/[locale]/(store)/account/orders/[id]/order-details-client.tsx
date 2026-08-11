"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, CreditCard, Package, Store, Loader2 } from "lucide-react";
import Image from "next/image";
import { BuyAgainButton } from "@/components/account/buy-again-button";
import { OrderCancelButton } from "@/components/account/order-cancel-button";

interface OrderDetailsClientProps {
  id: string;
  locale: string;
  translations: {
    orderDetails: string;
    shippingAddress: string;
    paymentMethod: string;
    subtotal: string;
    shippingFee: string;
    discount: string;
    totalAmount: string;
    writeReview: string;
    statusCompleted: string;
    statusCancelled: string;
    statusPending: string;
    statusProcessing: string;
    cancelOrder: string;
    confirmCancelOrder: string;
  };
}

export function OrderDetailsClient({ id, locale, translations: t }: OrderDetailsClientProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("not_found");
        throw new Error("Failed to fetch");
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const getStatusText = (status: string) => {
    if (status === 'COMPLETED') return t.statusCompleted || "Hoàn thành";
    if (status === 'CANCELLED') return t.statusCancelled || "Đã huỷ";
    if (status === 'PENDING') return t.statusPending || "Chờ thanh toán";
    if (status === 'PROCESSING') return t.statusProcessing || "Đang xử lý";
    return status;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[400px] justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/70" />
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="flex flex-col min-h-[400px] justify-center items-center bg-card p-6 border sm:border-border text-center">
        <Package className="w-12 h-12 mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Order not found</p>
        <Button variant="outline" className="mt-4" render={<Link href={`/${locale}/account/orders`} />}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const { order, variantMap: rawVariantMap } = data;
  const variantMap = new Map(Object.entries(rawVariantMap || {}));

  const buyAgainItems = order.items.map((item: any) => {
    const variant: any = variantMap.get(item.variantId);
    return {
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      price: Number(item.price),
      quantity: item.quantity,
      image: variant?.product?.images?.[0]?.url,
      productSlug: variant?.product?.slug,
    };
  });

  return (
    <div className="flex flex-col min-h-[400px] space-y-2 sm:space-y-3 pb-10 sm:pb-0 text-left">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-2 sm:border sm:border-border rounded-none">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -ml-1 rounded-none"
            render={<Link href={`/${locale}/account/orders`} />}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold">{
            order.orderNumber
          }</h1>
        </div>
        <div className={`text-xs font-semibold ${order.orderStatus === 'CANCELLED' ? 'text-destructive' : 'text-primary'}`}>
          {getStatusText(order.orderStatus)}
        </div>
      </div>

      {/* Address & Payment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-card p-3 sm:p-4 sm:border sm:border-border rounded-none">
          <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <h3 className="font-semibold text-xs text-foreground">{t.shippingAddress || "Địa chỉ nhận hàng"}</h3>
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerPhone}</p>
            <p className="text-muted-foreground mt-1">{order.address}</p>
          </div>
        </div>

        <div className="bg-card p-3 sm:p-4 sm:border sm:border-border rounded-none">
          <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <h3 className="font-semibold text-xs text-foreground">{t.paymentMethod || "Phương thức thanh toán"}</h3>
          </div>
          <div className="space-y-0.5 text-xs">
            <p>{order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : order.paymentMethod}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground">Trạng thái:</span>
              <span className={`px-2 py-0.5 font-semibold rounded-sm ${order.paymentStatus === 'PAID' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card sm:border sm:border-border rounded-none overflow-hidden">

        <div className="p-2.5 space-y-2">
          {order.items.map((item: any) => {
            const variant: any = variantMap.get(item.variantId);
            const imageUrl = variant?.product?.images?.[0]?.url || null;

            return (
              <div key={item.id} className="flex gap-3 items-start">
                <div className="w-14 h-14 bg-muted rounded-none shrink-0 flex items-center justify-center border border-border/50 overflow-hidden relative">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={item.productName} fill className="object-cover" />
                  ) : (
                    <Package className="w-5 h-5 opacity-20" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
                  <div>
                    <h4 className="font-medium text-xs line-clamp-1">{item.productName}</h4>
                    {item.variantName && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.variantName}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground">x{item.quantity}</p>
                    <div className="font-medium text-xs">
                      {formatPrice(Number(item.price), locale)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card p-3 sm:p-4 sm:border sm:border-border rounded-none space-y-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{t.subtotal || "Tổng tiền hàng"}</span>
          <span>{formatPrice(Number(order.subtotal), locale)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{t.shippingFee || "Phí vận chuyển"}</span>
          <span>{formatPrice(Number(order.shippingFee), locale)}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{t.discount || "Giảm giá"}</span>
            <span>-{formatPrice(Number(order.discount), locale)}</span>
          </div>
        )}
        <div className="border-t border-border/50 pt-2 flex justify-between items-center mt-1">
          <span className="font-medium text-xs sm:text-sm">{t.totalAmount || "Thành tiền"}</span>
          <span className="text-base font-bold text-primary">{formatPrice(Number(order.totalAmount), locale)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-2">
        {(order.orderStatus === 'PENDING' || order.orderStatus === 'PROCESSING') && (
          <OrderCancelButton
            orderId={order.id}
            cancelText={t.cancelOrder || (locale === "vi" ? "Huỷ đơn hàng" : "Cancel Order")}
            confirmText={t.confirmCancelOrder || (locale === "vi" ? "Bạn có chắc chắn muốn huỷ đơn hàng này không?" : "Are you sure you want to cancel this order?")}
          />
        )}
        {order.paymentMethod === 'VNPAY' && order.paymentStatus === 'PENDING' && order.orderStatus !== 'CANCELLED' && (
          <Button
            className="h-8 px-4 text-xs font-medium rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              // Client side handling for VNPAY click
              alert("VNPAY placeholder action");
            }}
          >
            Thanh toán ngay (VNPAY)
          </Button>
        )}
        {order.orderStatus === 'COMPLETED' && (
          <Button variant="outline" className="h-8 px-3 text-xs font-medium rounded-none">
            {t.writeReview || "Đánh giá"}
          </Button>
        )}
        {(order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED') && (
          <BuyAgainButton items={buyAgainItems} locale={locale} />
        )}
      </div>
    </div>
  );
}
