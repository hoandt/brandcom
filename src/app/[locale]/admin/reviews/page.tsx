"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldCheck, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status = "PENDING" | "APPROVED" | "REJECTED";
type AdminReview = {
  id: string; rating: number; title: string; body: string; status: Status; isVerifiedPurchase: boolean; createdAt: string;
  product: { name: string }; user: { name: string | null; email: string | null; phone: string | null }; _count: { helpfulVotes: number };
};

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const queryClient = useQueryClient();
  const query = useQuery<{ reviews: AdminReview[]; counts: Partial<Record<Status, number>> }>({
    queryKey: ["admin-reviews", status],
    queryFn: async () => {
      const response = await fetch(`/api/admin/reviews?status=${status}`);
      if (!response.ok) throw new Error("Failed to load reviews");
      return response.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: Status }) => {
      const response = await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error("Could not update review");
    },
    onSuccess: () => { toast.success("Review updated"); queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete review");
    },
    onSuccess: () => { toast.success("Review deleted"); queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  return <div className="mx-auto w-full max-w-6xl space-y-6 p-3 sm:p-6">
    <div><h1 className="text-2xl font-bold">Customer reviews</h1><p className="mt-1 text-sm text-muted-foreground">Moderate product feedback before it appears on the storefront.</p></div>
    <div className="flex border-b">
      {(["PENDING", "APPROVED", "REJECTED"] as Status[]).map((item) => <button key={item} onClick={() => setStatus(item)} className={`border-b-2 px-4 py-3 text-xs font-bold ${status === item ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{item[0] + item.slice(1).toLowerCase()} <span className="ml-1 text-[10px]">{query.data?.counts[item] || 0}</span></button>)}
    </div>
    {query.isLoading && <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>}
    {query.isError && <div className="border border-destructive/30 p-5 text-sm text-destructive">Reviews could not be loaded.</div>}
    {query.data?.reviews.length === 0 && <div className="border py-16 text-center text-sm text-muted-foreground">No {status.toLowerCase()} reviews.</div>}
    <div className="grid gap-3">
      {query.data?.reviews.map((review) => <article key={review.id} className="border bg-card p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><div className="flex">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-primary text-primary" : "text-border"}`} />)}</div><h2 className="font-semibold">{review.title}</h2>{review.isVerifiedPurchase && <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary"><ShieldCheck className="h-3.5 w-3.5" />Verified</span>}</div>
            <p className="mt-1 text-xs text-muted-foreground">{review.product.name} · {review.user.name || review.user.email || review.user.phone || "Customer"} · {new Date(review.createdAt).toLocaleDateString()}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/80">{review.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">{review._count.helpfulVotes} helpful votes</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {status !== "APPROVED" && <Button size="sm" onClick={() => updateMutation.mutate({ id: review.id, nextStatus: "APPROVED" })} className="rounded-none"><Check />Approve</Button>}
            {status !== "REJECTED" && <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: review.id, nextStatus: "REJECTED" })} className="rounded-none"><X />Reject</Button>}
            <Button size="icon-sm" variant="ghost" onClick={() => { if (confirm("Permanently delete this review?")) deleteMutation.mutate(review.id); }} className="rounded-none text-destructive"><Trash2 /></Button>
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
