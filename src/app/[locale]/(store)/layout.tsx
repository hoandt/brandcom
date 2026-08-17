import { Navbar } from "@/components/storefront/navbar"
import { Topbar } from "@/components/storefront/topbar"
import { Footer } from "@/components/storefront/footer"
import { getLocale } from "next-intl/server"
import { auth } from "@/auth"
import { getDynamicComponent } from "@/lib/dynamic-components"

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();
  const session = await auth();

  const [mainMenu, footerData, themeData, topbarData] = await Promise.all([
    getDynamicComponent("main-navbar"),
    getDynamicComponent("footer"),
    getDynamicComponent("theme-settings"),
    getDynamicComponent("top-bar")
  ]);

  const themeSettings = (themeData as any) || {};
  const customLogoUrl = themeSettings.logoUrl || undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar data={topbarData} />
      <Navbar session={session} dynamicMenu={mainMenu} logoUrl={customLogoUrl} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} dynamicFooter={footerData} logoUrl={customLogoUrl} />
    </div>
  )
}
