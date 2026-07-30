import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 pt-12 pb-40 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        {/* Skeleton for Images */}
        <div className="flex flex-col space-y-4">
          <div className="relative aspect-[3/4] w-full bg-secondary/50 animate-pulse rounded-md" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative aspect-[3/4] w-full bg-secondary/50 animate-pulse rounded-md" />
            ))}
          </div>
        </div>

        {/* Skeleton for Product Info */}
        <div className="flex flex-col space-y-8 pt-4">
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-secondary/50 animate-pulse rounded-md" />
            <div className="h-6 w-1/4 bg-secondary/50 animate-pulse rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-secondary/50 animate-pulse rounded-md" />
            <div className="h-4 w-full bg-secondary/50 animate-pulse rounded-md" />
            <div className="h-4 w-2/3 bg-secondary/50 animate-pulse rounded-md" />
          </div>
          <div className="h-14 w-full bg-secondary/50 animate-pulse rounded-full mt-8" />
        </div>
      </div>
    </div>
  );
}
