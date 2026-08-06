import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { OrderDetailClient } from "./order-detail-client";
import { PrintButton } from "./print-button";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; orderId: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { locale, orderId } = await params;

  // Fetch order from database
  const [order, storeSettings] = await Promise.all([prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true
    }
  }), getStoreSettings()]);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 w-full   mx-auto">

      {/* Custom Styles for Clean Printing */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide sidebar and admin chrome */
          aside, header, nav, .no-print, button, Link, a {
            display: none !important;
            visibility: hidden !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
        }
      `}} />

      {/* Top Bar: Navigation & Print (no-print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 no-print border-b pb-3">
        <div>
          <Link
            href={`/${locale}/admin/orders`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders list
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber}</h1>
        </div>

        {/* Printable button trigger */}
        <PrintButton />
      </div>

      {/* Fulfill / Status Admin Management Console (no-print) */}
      <div className="no-print">
        <OrderDetailClient
          orderId={order.id}
          initialOrderStatus={order.orderStatus}
          initialPaymentStatus={order.paymentStatus}
        />
      </div>

      {/* Invoice Statement Sheet (Paper style card) */}
      <div className="printable-invoice bg-background border border-border rounded-none p-4 sm:p-6 shadow-none space-y-4">

        {/* Invoice Statement Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground font-bold text-2xl uppercase tracking-widest">
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-none font-black text-xl">A</span>
              {storeSettings.storeName}
            </div>
            <p className="text-xs text-muted-foreground font-light">Seamless Essentials Store</p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-xl font-bold uppercase tracking-widest text-primary">Invoice Statement</h2>
            <div className="text-xs font-semibold text-foreground">Order: #{order.orderNumber}</div>
            <div className="text-[11px] text-muted-foreground font-light">
              Date: {new Date(order.createdAt).toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric"
              })}
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        {/* Invoice Parties: From / To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-muted-foreground">
          {/* Merchant Info */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-foreground text-[10px] uppercase tracking-widest">Merchant Details</h4>
            <div className="font-semibold text-foreground">{storeSettings.legalName || storeSettings.storeName}</div>
            {storeSettings.supportEmail && <div>{storeSettings.supportEmail}</div>}
            {storeSettings.supportPhone && <div>{storeSettings.supportPhone}</div>}
          </div>

          {/* Customer billing Info */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-foreground text-[10px] uppercase tracking-widest">Bill To</h4>
            <div className="font-semibold text-foreground">{order.customerName}</div>
            <div className="flex gap-1">
              <span>Phone:</span>
              <span className="font-medium text-foreground">{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <div className="flex gap-1">
                <span>Email:</span>
                <span>{order.customerEmail}</span>
              </div>
            )}
            <div className="pt-1 mt-1 border-t border-border/30 text-foreground font-normal">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground block font-bold mb-0.5">Shipping Address</span>
              {order.address}
            </div>
          </div>
        </div>

        {/* Items Invoice Table */}
        <div className="border border-border rounded-none overflow-hidden shadow-none">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead className="bg-muted/40 font-heading uppercase tracking-wider text-[10px] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Item Description</th>
                <th className="px-5 py-3 text-left w-36">SKU</th>
                <th className="px-5 py-3 text-right w-24">Price</th>
                <th className="px-5 py-3 text-center w-20">Quantity</th>
                <th className="px-5 py-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-background text-foreground">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <div className="font-bold text-xs">{item.productName}</div>
                    {item.variantName && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Variant: {item.variantName}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{item.sku}</td>
                  <td className="px-4 py-2.5 text-right font-light text-xs">{formatPrice(Number(item.price), locale, storeSettings.currency)}</td>
                  <td className="px-4 py-2.5 text-center font-light text-xs">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-xs">{formatPrice(Number(item.price) * item.quantity, locale, storeSettings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Totals Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3">

          {/* Left Summary: Payment Status */}
          <div className="text-xs space-y-1.5 font-light text-muted-foreground">
            <div className="flex gap-2">
              <span className="font-semibold text-foreground w-24">Payment Method:</span>
              <span className="uppercase">{order.paymentMethod}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-foreground w-24">Payment Status:</span>
              <span className="font-bold text-foreground">{order.paymentStatus}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-foreground w-24">Order Status:</span>
              <span className="font-semibold text-foreground">{order.orderStatus}</span>
            </div>
          </div>

          {/* Right Summary: Calculations */}
          <div className="w-full sm:max-w-xs text-xs font-light text-muted-foreground space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatPrice(Number(order.subtotal), locale, storeSettings.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping & Handling</span>
              <span className="font-medium text-foreground">{formatPrice(Number(order.shippingFee), locale, storeSettings.currency)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Coupon Discount</span>
                <span className="font-medium">- {formatPrice(Number(order.discount), locale, storeSettings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span className="text-primary text-base font-black">{formatPrice(Number(order.totalAmount), locale, storeSettings.currency)}</span>
            </div>
          </div>
        </div>

        {/* Invoice footer note */}
        <div className="border-t pt-4 text-center text-[10px] text-muted-foreground font-light tracking-wide uppercase">
          Thank you for choosing {storeSettings.storeName}!
          {storeSettings.supportEmail && ` • For enquiries, email ${storeSettings.supportEmail}`}
        </div>
      </div>
    </div>
  );
}
