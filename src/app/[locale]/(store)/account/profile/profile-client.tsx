"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { AccountForm } from "../account-form"

interface ProfileClientProps {
  sessionName?: string | null
  locale: string
  title: string
}

export function ProfileClient({ sessionName, locale, title }: ProfileClientProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile")
      if (!res.ok) throw new Error("Failed to fetch profile")
      return res.json()
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  return (
    <div className="bg-card border border-border rounded-none overflow-hidden shadow-none">
      <div className="p-3 border-b border-border bg-muted/20 text-left">
        <h2 className="text-sm font-heading uppercase tracking-widest text-primary font-bold">{title}</h2>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
          </div>
        ) : isError || !data?.user ? (
          <div className="py-6 text-center text-xs text-destructive">
            Failed to load profile. Please try refreshing.
          </div>
        ) : (
          <div className="space-y-4">
            <AccountForm
              user={data.user}
              sessionName={sessionName}
              locale={locale}
            />
          </div>
        )}
      </div>
    </div>
  )
}
