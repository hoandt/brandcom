"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star, ThumbsUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  viewerFoundHelpful: boolean;
  createdAt: string;
};

type ReviewsResponse = {
  reviews: Review[];
  summary: { total: number; average: number; distribution: Record<number, number> };
  pagination: { page: number; pageCount: number };
};

function Stars({ rating, interactive, onChange }: { rating: number; interactive?: boolean; onChange?: (rating: number) => void }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={!interactive} onClick={() => onChange?.(star)} className={interactive ? "cursor-pointer" : "cursor-default"}>
          <Star className={`h-4 w-4 ${star <= rating ? "fill-primary text-primary" : "fill-transparent text-border"}`} />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const t = useTranslations("Reviews");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"helpful" | "recent">("helpful");
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");

  const query = useQuery<ReviewsResponse>({
    queryKey: ["product-reviews", productId, page, sort],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/reviews?page=${page}&sort=${sort}`);
      if (!response.ok) throw new Error(t("loadError"));
      return response.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || t("submitError")), { status: response.status });
      return data;
    },
    onSuccess: () => {
      setShowForm(false);
      setTitle("");
      setBody("");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (error: Error & { status?: number }) => setFormError(error.message),
  });

  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      if (!response.ok) throw new Error(t("signInToVote"));
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] }),
  });

  const data = query.data;
  const summary = data?.summary;

  return (
    <section className="w-full border-t border-border/70 px-4 py-12 sm:px-6 lg:px-8 lg:py-16" aria-labelledby="reviews-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
            <h2 id="reviews-heading" className="font-heading text-3xl font-medium text-foreground/85 sm:text-4xl">{t("title")}</h2>
          </div>
          <Button onClick={() => setShowForm((value) => !value)} variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
            {showForm ? t("cancel") : t("writeReview")}
          </Button>
        </div>

        {showForm && (
          <form className="mb-10 max-w-2xl space-y-4 border border-border bg-card p-5 shadow-sm" onSubmit={(event) => { event.preventDefault(); setFormError(""); submitMutation.mutate(); }}>
            <div><p className="mb-2 text-sm font-semibold">{t("rate", { productName })}</p><Stars rating={rating} interactive onChange={setRating} /></div>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("headlinePlaceholder")} minLength={3} maxLength={100} required className="rounded-none" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("bodyPlaceholder")} minLength={20} maxLength={3000} required rows={5} className="w-full resize-y border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            {formError && <p className="text-sm text-destructive">{formError} {formError.toLowerCase().includes("sign in") && <Link href={`/${locale}/login`} className="font-semibold underline">{t("signIn")}</Link>}</p>}
            <Button type="submit" disabled={submitMutation.isPending} className="rounded-none">{submitMutation.isPending ? t("submitting") : t("submit")}</Button>
            <p className="text-xs text-muted-foreground">{t("moderationNote")}</p>
          </form>
        )}

        {query.isLoading && <div className="h-48 animate-pulse bg-muted/50" />}
        {query.isError && <p className="py-8 text-sm text-destructive">{t("loadError")}</p>}

        {data && (
          <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside>
              <div className="flex items-end gap-2"><span className="text-5xl font-semibold text-primary">{summary?.average.toFixed(1)}</span><span className="pb-1 text-sm text-muted-foreground">/ 5</span></div>
              <div className="my-3 flex items-center gap-2"><Stars rating={Math.round(summary?.average || 0)} /><span className="text-sm text-muted-foreground">{t("globalRatings", { count: summary?.total || 0 })}</span></div>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary?.distribution[star] || 0;
                  const percentage = summary?.total ? Math.round((count / summary.total) * 100) : 0;
                  return <div key={star} className="grid grid-cols-[34px_1fr_36px] items-center gap-2 text-xs"><span>{star} ★</span><div className="h-2 overflow-hidden bg-muted"><div className="h-full bg-primary" style={{ width: `${percentage}%` }} /></div><span className="text-right text-muted-foreground">{percentage}%</span></div>;
                })}
              </div>
            </aside>

            <div>
              <div className="mb-2 flex justify-end">
                <select value={sort} onChange={(event) => { setSort(event.target.value as "helpful" | "recent"); setPage(1); }} className="border bg-background px-3 py-2 text-xs font-medium outline-none">
                  <option value="helpful">{t("mostHelpful")}</option><option value="recent">{t("mostRecent")}</option>
                </select>
              </div>
              {data.reviews.length === 0 ? <div className="border-y py-12 text-center text-sm text-muted-foreground">{t("empty")}</div> : data.reviews.map((review) => (
                <article key={review.id} className="border-t border-border/70 py-6 first:border-t-0">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1"><Stars rating={review.rating} /><h3 className="font-semibold">{review.title}</h3></div>
                  <p className="text-xs text-muted-foreground">{review.authorName} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(review.createdAt))}</p>
                  {review.isVerifiedPurchase && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="h-3.5 w-3.5" />{t("verifiedPurchase")}</p>}
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/80">{review.body}</p>
                  <button onClick={() => helpfulMutation.mutate(review.id)} className={`mt-4 flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors ${review.viewerFoundHelpful ? "border-primary/30 bg-primary/5 text-primary" : "hover:border-primary/30 hover:text-primary"}`}><ThumbsUp className="h-3.5 w-3.5" />{t("helpful")} {review.helpfulCount > 0 && `(${review.helpfulCount})`}</button>
                </article>
              ))}
              {data.pagination.pageCount > 1 && <div className="mt-5 flex items-center justify-end gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-none">{t("previous")}</Button><span className="text-xs text-muted-foreground">{page} / {data.pagination.pageCount}</span><Button variant="outline" disabled={page === data.pagination.pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-none">{t("next")}</Button></div>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductRatingInline({ productId }: { productId: string }) {
  const t = useTranslations("Reviews");
  const locale = useLocale();
  const query = useQuery<ReviewsResponse>({
    queryKey: ["product-reviews", productId, 1, "helpful"],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/reviews?page=1&sort=helpful`);
      if (!response.ok) throw new Error("Failed to load rating");
      return response.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const summary = query.data?.summary;
  if (query.isLoading) return <div className="h-4 w-44 animate-pulse bg-muted" aria-hidden="true" />;
  if (!summary?.total) return <span className="text-xs text-muted-foreground">{locale === "vi" ? "Chưa có đánh giá" : locale === "th" ? "ยังไม่มีรีวิว" : "No reviews yet"}</span>;
  return <div className="flex items-center gap-1.5"><Stars rating={Math.round(summary.average)} /><a href="#reviews-heading" className="text-xs text-muted-foreground hover:underline">{summary.average.toFixed(1)}/5 · {t("globalRatings", { count: summary.total })}</a></div>;
}
