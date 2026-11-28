"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function OfferCountdown({ code, endsAt, preview = false, onExpire }: {
  code?: string;
  preview?: boolean;
  endsAt: string;
  onExpire: (endsAt: string) => void;
}) {
  const t = useTranslations("ProductOffer");
  const [remaining, setRemaining] = useState<number>();

  useEffect(() => {
    const deadline = Date.parse(endsAt);
    if (!Number.isFinite(deadline)) return;

    function tick() {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) onExpire(endsAt);
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [endsAt, onExpire]);

  if (!remaining) return null;

  const time = [
    Math.floor(remaining / 3600),
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ].map((part) => String(part).padStart(2, "0")).join(":");

  return (
    <p className="text-center text-xs tabular-nums text-muted-foreground">
      {t(preview ? "previewCountdown" : "offerRemaining", { time })}
      {code && <span className="whitespace-nowrap"> · {code}</span>}
    </p>
  );
}
