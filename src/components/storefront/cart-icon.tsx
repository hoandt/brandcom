"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";

export function CartIcon() {
  const locale = useLocale();
  const t = useTranslations("Navbar");
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const count = mounted ? itemCount : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("cartAction", { count })}
      className="relative size-10 text-foreground sm:size-12"
      render={<Link href={`/${locale}/checkout`} />}
    >
      <ShoppingBag className="size-[22px]" strokeWidth={1.65} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-none text-white sm:right-1 sm:top-1"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
