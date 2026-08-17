"use client";

import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useLocale } from "next-intl";
import { formatPrice } from "@/lib/utils";

export function CartIcon({ isTransparent }: { isTransparent?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const locale = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  const [isBumping, setIsBumping] = useState(false);
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setIsBumping(true);
      const timer = setTimeout(() => setIsBumping(false), 300);
      prevCount.current = itemCount;
      return () => clearTimeout(timer);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  if (!mounted || itemCount === 0) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cart"
        className={`${isTransparent ? "text-white hover:text-white hover:bg-white/20" : ""} transition-transform duration-300 ${isBumping ? "scale-125" : "scale-100"}`}
        render={<Link href={`/${locale}/checkout`} />}
      >
        <ShoppingBag className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Link
      href={`/${locale}/checkout`}
      aria-label={`${itemCount} ${itemCount === 1 ? "item" : "items"}, ${formatPrice(cartTotal, locale)}`}
      className={`group flex h-10 items-center gap-1.5 sm:gap-2 rounded-full px-2 sm:px-3 transition-all duration-300 ${
        isTransparent
          ? "bg-white/20 text-white hover:bg-white/30"
          : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
      } ${isBumping ? "scale-110" : "scale-100"}`}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <ShoppingBag className="h-[18px] w-[18px]" />
        <span className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ${isTransparent ? "bg-white text-foreground" : "bg-background text-primary"}`}>
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      </span>
      <span className="hidden sm:inline-flex whitespace-nowrap text-xs font-extrabold tracking-tight">
        {formatPrice(cartTotal, locale)}
      </span>
      <ChevronRight className="hidden sm:block h-3.5 w-3.5 shrink-0 opacity-75 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
