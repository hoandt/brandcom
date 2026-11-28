"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";

export function StickyMobileBar({ anchor, hidden, price, label, disabled, onBuy }: {
  anchor: RefObject<HTMLButtonElement | null>;
  hidden: boolean;
  price: string;
  label: string;
  disabled: boolean;
  onBuy: () => void;
}) {
  const [pastBuyButton, setPastBuyButton] = useState(false);

  useEffect(() => {
    const button = anchor.current;
    if (!button) return;
    const update = () => setPastBuyButton(button.getBoundingClientRect().bottom <= 0);
    const observer = new IntersectionObserver(update);
    // A jump between anchors can skip the intersection entirely.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    observer.observe(button);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [anchor]);

  if (!pastBuyButton || hidden) return null;

  return (
    <div data-pdp-mobile-purchase className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <span data-pdp-sticky-price className="whitespace-nowrap text-lg font-semibold tabular-nums text-foreground">{price}</span>
      <Button type="button" onClick={onBuy} disabled={disabled} className="h-12 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-[var(--pdp-wine-hover)]">
        {label}
      </Button>
    </div>
  );
}
