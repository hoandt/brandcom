import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { AccountNav } from "@/components/account/account-nav"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations("Account")

  const translations = {

    orders: t("sidebarOrders"),
    profile: t("sidebarProfile"),
    addresses: t("sidebarAddresses"),
    vouchers: t("sidebarVouchers"),
    notifications: t("sidebarNotifications"),
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-4 md:py-8">
      <div className="flex flex-col gap-4 md:gap-5">
        {/* User Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border bg-card sm:bg-transparent p-3 sm:p-0 rounded-none sm:shadow-none shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center text-primary font-bold text-base uppercase overflow-hidden shrink-0 border border-primary/20">
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                session.user.name?.charAt(0) || "U"
              )}
            </div>
            <div>
              <div className="font-bold text-base truncate max-w-[200px]">{session.user.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                {session.user.email}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <form
              action={async () => {
                "use server"
                const { signOut } = await import("@/auth")
                await signOut({ redirectTo: "/" })
              }}
            >
              <button type="submit" className="text-[10px] font-semibold text-destructive hover:underline cursor-pointer tracking-wider border border-destructive/20 hover:bg-destructive/5 px-2 py-1 rounded-none transition-colors uppercase">
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <AccountNav locale={locale} translations={translations} />

        {/* Main Content */}
        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
