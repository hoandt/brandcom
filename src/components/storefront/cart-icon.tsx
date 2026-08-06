"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
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
    <Link href={`/${locale}/checkout`}>
      <div className={`flex items-center gap-2 h-10 px-3 rounded-full transition-all duration-300 ${
        isTransparent
          ? "bg-white/20 text-white hover:bg-white/30"
          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      } ${isBumping ? "scale-110" : "scale-100"}`}>
        <ShoppingBag className="h-4 w-4" />
        <div className="flex flex-col items-start leading-none tracking-tight">
          <span className="text-[10px] opacity-90 font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          <span className="text-xs font-bold">{formatPrice(cartTotal, locale)}</span>
        </div>
      </div>
    </Link>
  );
}
