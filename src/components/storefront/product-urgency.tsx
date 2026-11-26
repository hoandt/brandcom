"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flame, ShoppingBag, Truck, X, Zap } from "lucide-react";
import type { PromotionSettings } from "@/lib/product-promotion";

type ProductActivity = {
  stock: Record<string, number>;
  sold: number;
  recent: { count: number; latestMinute: number } | null;
  campaign: { code: string; name: string; endsAt: string } | null;
  announcement?: string;
  expressShipping?: PromotionSettings["expressShipping"];
};

export function getVietnameseProductSlug(pathname: string) {
  const match = pathname.match(/^\/vi\/products\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function useProductActivity(slug: string | null) {
  return useQuery<ProductActivity>({
    queryKey: ["product-activity", slug],
    enabled: Boolean(slug),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/product-activity/${encodeURIComponent(slug ?? "")}`, { signal });
      if (!response.ok) throw new Error("Không thể cập nhật thông tin sản phẩm");
      return response.json();
    },
    staleTime: 14_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

const subscribeToHydration = () => () => {};

export function useStorefrontHydration() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function useClock(enabled: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [enabled]);
  return enabled ? now : null;
}

export function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
}

export function ProductCampaignBar({ slug }: { slug: string }) {
  const query = useProductActivity(slug);
  const hydrated = useStorefrontHydration();
  const { campaign, announcement } = query.data ?? {};
  const now = useClock(Boolean(campaign));
  const expiresAt = campaign ? Date.parse(campaign.endsAt) : 0;
  const running = campaign && (now === null || now < expiresAt) && !query.isError;

  if (!hydrated || query.isPending) {
    return <div className="h-8 animate-pulse bg-[#7a1c37]" aria-label="Đang tải ưu đãi" />;
  }
  if (query.isError) return null;
  if (!running && !announcement) return null;

  return (
    <a href={running ? "#product-vouchers" : "#product-purchase"} data-pdp-campaign
      className="flex min-h-8 w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 bg-[#7a1c37] px-3 py-1.5 text-center text-[11px] font-semibold leading-4 text-white">
      {running ? (
        <>
          <span className="inline-flex items-center gap-1 uppercase"><Zap className="size-3 shrink-0" aria-hidden="true" /> Ưu đãi kết thúc sau</span>
          <span role="timer" aria-live="off" className="min-w-[4.75rem] rounded-sm bg-white/15 px-1.5 font-bold tabular-nums">
            {now === null ? "--:--:--" : formatCountdown(expiresAt - now)}
          </span>
          <span className="max-w-full break-words">{campaign.name} · Mã {campaign.code}</span>
        </>
      ) : announcement}
    </a>
  );
}

export function getVietnamCutoff(now: number, express: NonNullable<PromotionSettings["expressShipping"]>) {
  // Vietnam observes UTC+7 year-round. Use UTC arithmetic on the shifted clock.
  const vietnamOffset = 7 * 60 * 60_000;
  const local = new Date(now + vietnamOffset);
  if (!express.days.includes(local.getUTCDay())) return null;
  const [hours, minutes] = express.cutoff.split(":").map(Number);
  const deadline = local.setUTCHours(hours, minutes, 0, 0) - vietnamOffset;
  return deadline > now ? deadline : null;
}

export function ExpressCutoff({ express }: { express: NonNullable<PromotionSettings["expressShipping"]> }) {
  const now = useClock(true);
  const deadline = now === null ? null : getVietnamCutoff(now, express);
  if (deadline === null || now === null) return null;

  return (
    <div data-pdp-express className="flex items-center gap-2 border border-[#edd9de] bg-[#F9F0F2] px-2.5 py-1.5 text-[11px] leading-4 text-[#5b2738]">
      <Truck className="size-4 shrink-0 text-[#7a1c37]" aria-hidden="true" />
      <p>
        Đặt trong <span role="timer" aria-live="off" className="font-bold tabular-nums">{formatCountdown(deadline - now)}</span> · Giao hỏa tốc hôm nay tại {express.area}, tùy địa chỉ.
      </p>
    </div>
  );
}

function LiveViewerPill({ slug }: { slug: string }) {
  const visitRef = useRef<string | null>(null);
  const { mutate, data, isError } = useMutation({
    mutationKey: ["product-presence", slug],
    mutationFn: async (visit: string): Promise<{ viewers: number }> => {
      const response = await fetch(`/api/product-activity/${encodeURIComponent(slug)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visit }),
      });
      if (!response.ok) throw new Error("Không thể cập nhật lượt xem");
      return response.json();
    },
  });

  useEffect(() => {
    const visit = visitRef.current ??= crypto.randomUUID();
    const heartbeat = () => {
      if (document.visibilityState === "visible") mutate(visit);
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 12_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [slug, mutate]);

  if (isError || !data || data.viewers < 2) return null;
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#edd9de] bg-[#F9F0F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#7a1c37]">
      <span className="relative size-1.5 shrink-0 rounded-full bg-[#7a1c37]" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-[#7a1c37]/50 motion-safe:animate-ping" />
      </span>
      Ít nhất {data.viewers} lượt xem đang hoạt động
    </span>
  );
}

export function ProductDemand({ slug, track, stock, threshold, variant }: {
  slug: string; track: boolean; stock?: number; threshold: number; variant?: string;
}) {
  const lowStock = stock !== undefined && stock > 0 && stock <= threshold;
  return (
    <div className="flex flex-col gap-2 empty:hidden">
      {track && <LiveViewerPill key={slug} slug={slug} />}
      {lowStock && (
        <div data-pdp-low-stock className="space-y-1.5">
          <p role="status" className="flex items-center gap-1.5 text-xs font-bold text-[#7a1c37]">
            <Flame className="size-3.5 shrink-0" aria-hidden="true" /> Chỉ còn {stock} trong kho{variant && ` · ${variant}`}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-[#F9F0F2]" aria-hidden="true">
            <div className="h-full rounded-full bg-[#7a1c37] motion-safe:transition-[width] motion-safe:duration-500"
              style={{ width: `${(stock / threshold) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function RecentPurchaseToast({ recent, imageUrl, stickyHeight, paused }: {
  recent: ProductActivity["recent"]; imageUrl?: string; stickyHeight: number; paused: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastShown = useRef("");
  const event = recent ? String(recent.latestMinute) : "";

  useEffect(() => {
    if (!event || dismissed || paused || event === lastShown.current) return;
    // Defer the first appearance until the purchase summary has rendered.
    const show = window.setTimeout(() => {
      lastShown.current = event;
      setVisible(true);
    }, 500);
    const hide = window.setTimeout(() => setVisible(false), 5_500);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
      setVisible(false);
    };
  }, [event, dismissed, paused]);

  if (!recent || !visible || dismissed || paused) return null;
  return (
    <aside role="status" data-pdp-purchase-toast
      style={{ "--purchase-toast-bottom": `${Math.max(16, stickyHeight + 8)}px` } as CSSProperties}
      className="pointer-events-none fixed bottom-[var(--purchase-toast-bottom)] left-2 z-30 flex max-w-[calc(100vw-1rem)] items-center gap-2 border border-[#7a1c37]/35 bg-[#FDFBF9] p-1.5 pr-10 shadow-md sm:left-5">
      <div className="relative flex size-8 shrink-0 items-center justify-center bg-[#F9F0F2] text-[#7a1c37]">
        {imageUrl ? <Image src={imageUrl} alt="" fill sizes="32px" className="object-cover" /> : <ShoppingBag className="size-4" />}
      </div>
      <p className="text-xs leading-4 text-[#5b2738]"><strong>{recent.count} đơn có sản phẩm này</strong><br />Trong 15 phút qua</p>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Đóng thông báo mua hàng"
        className="pointer-events-auto absolute right-0 top-0 grid size-9 place-items-center text-[#7a1c37] hover:bg-[#F9F0F2]">
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  );
}
