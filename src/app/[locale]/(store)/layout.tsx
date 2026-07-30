import { Navbar } from "@/components/storefront/navbar"
import { Footer } from "@/components/storefront/footer"
import { getLocale } from "next-intl/server"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  )
}
