"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { PackageOpen, Store, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import { BuyAgainButton } from "@/components/account/buy-again-button"

interface OrdersClientProps {
  locale: string;
  initialStatus: string;
  translations: {
    totalAmount: string;
    products: string;
    writeReview: string;
    viewCancelDetails: string;
    viewDetails: string;
    buyAgain: string;
    statusCompleted: string;
    statusCancelled: string;
    ordersAll: string;
    ordersToPay: string;
    ordersToShip: string;
    ordersCompleted: string;
    ordersCancelled: string;
    sidebarOrderStatuses: string;
  }
}

interface OrderVariant {
  product?: {
    images?: Array<{ url: string }>;
    slug?: string;
  };
}

interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantName?: string | null;
  sku: string;
  price: number | string;
  quantity: number;
}

interface OrderSummary {
  id: string;
  orderNumber?: string | null;
  orderStatus: string;
  totalAmount: number | string;
  items: OrderItem[];
}

interface OrdersResponse {
  orders: OrderSummary[];
  variantMap: Record<string, OrderVariant>;
  counts: Record<string, number>;
}

export function OrdersClient({ locale, initialStatus, translations }: OrdersClientProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const tabs = [
    { id: "all", label: translations.ordersAll },
    { id: "pending", label: translations.ordersToPay },
    { id: "processing", label: translations.ordersToShip },
    { id: "completed", label: translations.ordersCompleted },
    { id: "cancelled", label: translations.ordersCancelled },
  ]

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["orders", currentStatus],
    queryFn: async () => {
      const res = await fetch(`/api/user/orders?status=${currentStatus}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return (await res.json()) as OrdersResponse
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const handleTabChange = (statusId: string) => {
    setCurrentStatus(statusId)
    const url = new URL(window.location.href)
    if (statusId === "all") {
      url.searchParams.delete("status")
    } else {
      url.searchParams.set("status", statusId)
    }
    window.history.pushState({}, "", url.toString())
  }

  useEffect(() => {
    tabRefs.current[currentStatus]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [currentStatus])

  useEffect(() => {
    const handleHistoryChange = () => {
      const status = new URL(window.location.href).searchParams.get("status")
      const nextStatus = [
        "all",
        "pending",
        "processing",
        "completed",
        "cancelled",
      ].includes(status || "")
        ? status!
        : "all"
      setCurrentStatus(nextStatus)
    }

    window.addEventListener("popstate", handleHistoryChange)
    return () => window.removeEventListener("popstate", handleHistoryChange)
  }, [])

  const orders = data?.orders || []
  const variantMap = new Map(Object.entries(data?.variantMap || {}))
  const counts = data?.counts || {}

  return (
    <div className="bg-muted/10 sm:bg-card sm:border sm:border-border rounded-none overflow-hidden flex flex-col min-h-[400px] relative">
      {/* Tabs Header */}
      <div className="sticky top-0 z-10 overflow-x-auto overscroll-x-contain border-b border-border bg-card hide-scrollbar">
        <div
          role="tablist"
          aria-label={translations.sidebarOrderStatuses}
          className="flex min-w-max snap-x snap-mandatory sm:min-w-full"
        >
          {tabs.map((tab) => {
            const isActive = currentStatus === tab.id
            const count = Number(counts[tab.id] ?? 0)

            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex min-w-[9.5rem] shrink-0 snap-center items-center justify-center gap-2 border-b-2 px-4 py-3 text-xs outline-none transition-colors sm:min-w-0 sm:flex-1 ${isActive
                    ? "border-primary bg-primary/[0.04] font-bold text-primary"
                    : "border-transparent font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                <span
                  className={`min-w-5 border px-1.5 py-0.5 text-center text-[10px] tabular-nums ${isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                    }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 flex flex-col bg-muted/20 sm:bg-muted/5 p-0 sm:p-3 pb-10 sm:pb-3 min-h-[300px] justify-center">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-50 bg-card">
            <PackageOpen className="w-12 h-12 mb-3 text-muted-foreground" />
            <p className="text-muted-foreground uppercase tracking-widest text-xs">No orders found.</p>
          </div>
        ) : (
          <div className={`space-y-2 sm:space-y-3 transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {orders.map((order) => {
              const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);

              // Helper to translate status
              const getStatusText = (status: string) => {
                if (status === 'COMPLETED') return translations.statusCompleted;
                if (status === 'CANCELLED') return translations.statusCancelled;
                return status;
              };

              return (
                <div key={order.id} className="bg-card sm:border sm:border-border rounded-none overflow-hidden text-left">
                  {/* Shop Header */}
                  <div className="flex items-center justify-between p-2 sm:p-3 border-b border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-muted-foreground" />
                      <Link href={`/${locale}/account/orders/${order.id}`} className="font-semibold text-xs uppercase hover:text-primary transition-colors hover:underline">
                        {order.orderNumber || order.id}
                      </Link>
                    </div>
                    <div className={`text-xs font-semibold ${order.orderStatus === 'CANCELLED' ? 'text-destructive' : 'text-primary'}`}>
                      {getStatusText(order.orderStatus)}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-2 py-2 sm:px-3 sm:py-3 space-y-2">
                    {order.items.map((item) => {
                      const variant = variantMap.get(item.variantId);
                      const imageUrl = variant?.product?.images?.[0]?.url || null;

                      return (
                        <Link key={item.id} href={`/${locale}/account/orders/${order.id}`} className="flex gap-2.5 items-start group hover:bg-muted/10 p-1.5 -mx-1.5 rounded-none transition-colors cursor-pointer">
                          <div className="w-14 h-14 bg-muted rounded-none shrink-0 flex items-center justify-center border border-border/50 text-muted-foreground overflow-hidden relative">
                            {imageUrl ? (
                              <Image src={imageUrl} alt={item.productName} fill className="object-cover" />
                            ) : (
                              <PackageOpen className="w-5 h-5 opacity-20" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
                            <div>
                              <h4 className="font-medium text-xs line-clamp-1 leading-snug">{item.productName}</h4>
                              {item.variantName && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-light line-clamp-1">{item.variantName}</p>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-medium text-muted-foreground">x{item.quantity}</p>
                              <div className="text-right font-medium text-xs">
                                {formatPrice(Number(item.price), locale)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="p-2 sm:p-3 border-t border-border/50 bg-card">
                    <div className="flex justify-end items-center gap-1 mb-2">
                      <span className="text-xs text-muted-foreground">
                        {translations.totalAmount} ({totalItems} {translations.products}):
                      </span>
                      <span className="text-sm font-bold text-primary ml-1">{formatPrice(Number(order.totalAmount), locale)}</span>
                    </div>

                    <div className="flex justify-end items-center gap-1.5">
                      {order.orderStatus === 'COMPLETED' && (
                        <Button variant="outline" className="h-8 px-3 text-xs font-medium rounded-none">
                          {translations.writeReview}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        className="h-8 px-3 text-xs font-medium rounded-none"
                        render={<Link href={`/${locale}/account/orders/${order.id}`} />}
                      >
                        {translations.viewDetails || "Xem chi tiết"}
                      </Button>
                      {(order.orderStatus === 'COMPLETED' || order.orderStatus === 'CANCELLED') && (
                        <BuyAgainButton
                          locale={locale}
                          items={order.items.map((item) => {
                            const variant = variantMap.get(item.variantId);
                            return {
                              variantId: item.variantId,
                              productName: item.productName,
                              variantName: item.variantName || undefined,
                              sku: item.sku,
                              price: Number(item.price),
                              quantity: item.quantity,
                              image: variant?.product?.images?.[0]?.url,
                              productSlug: variant?.product?.slug,
                            }
                          })}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )
}
