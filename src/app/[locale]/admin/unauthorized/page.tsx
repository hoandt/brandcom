"use client"

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

export default function AdminUnauthorizedPage() {
  const locale = useLocale();

  useEffect(() => {
    // Automatically log out non-admin user when trying to access admin
    signOut({ callbackUrl: `/${locale}/admin/login` });
  }, [locale]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Logging out...</h1>
        <p className="text-xs text-muted-foreground">
          You are currently logged in with a customer account. We are signing you out to access the Store Owner administration dashboard.
        </p>
      </div>
    </div>
  );
}
