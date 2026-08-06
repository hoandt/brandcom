import { Navbar } from "@/components/storefront/navbar"
import { Footer } from "@/components/storefront/footer"
import { getLocale } from "next-intl/server"
import { auth } from "@/auth"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar session={session} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  )
}
