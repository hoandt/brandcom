"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

export function CartIcon({ isTransparent }: { isTransparent?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((state) => state.items);
  const locale = useLocale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        aria-label="Cart" 
        className={isTransparent ? "text-white hover:text-white hover:bg-white/20" : ""}
        render={<Link href={`/${locale}/checkout`} />}
      >
        <ShoppingBag className="h-5 w-5" />
      </Button>
      {mounted && itemCount > 0 && (
        <span className="absolute top-0 right-0 flex h-4 w-4 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-foreground text-[10px] text-background font-bold pointer-events-none">
          {itemCount}
        </span>
      )}
    </div>
  );
}
