import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StorefrontArrowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 max-w-full items-center gap-2 font-sans text-sm font-semibold leading-5 text-[#642b43] no-underline transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
    </Link>
  );
}
