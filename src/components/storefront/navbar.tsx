"use client";

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Search, Menu, User, Globe, X, ShoppingBag, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations, useLocale } from "next-intl"
import { LanguageSwitcher } from "./language-switcher"
import { CartIcon } from "./cart-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"
import { DesktopCategoryMenu, MobileCategoryMenu } from "./category-navigation"

export function Navbar({ session, dynamicMenu, logoUrl }: { session: Session | null; dynamicMenu?: any[]; logoUrl?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("Navbar")
  const tAccount = useTranslations("Account")
  const locale = useLocale()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) return;
    const newPathname = pathname.replace(/^\/(en|vi|th)/, `/${newLocale}`);
    router.push(newPathname);
    router.refresh();
  };

  const languages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "English" },
    { code: "th", name: "ไทย" },
  ];

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false)
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMobileMenuOpen])

  const isHomepage = pathname === `/${locale}` || pathname === "/"
  const isShopActive = ["/collections/", "/categories/", "/products/"].some((segment) => pathname.includes(segment)) || isCategoryOpen
  const navigationLinkClass = "border-b-2 border-transparent py-3 font-sans text-sm font-medium text-muted-foreground transition-colors hover:border-current hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"

  return (
    <header
      className={`z-50 w-full border-b border-border/50 transition-all duration-300 ${isHomepage
        ? "relative bg-white"
        : "sticky top-0 bg-background/70 backdrop-blur-xl shadow-sm"
        }`}
    >
      <div className="storefront-container flex h-[4.5rem] min-w-0 items-center justify-between gap-2 text-foreground transition-colors duration-300 lg:h-20">

        {/* Left Section: Logo & Desktop Links */}
        <div className="flex h-full min-w-0 shrink items-center gap-6 xl:gap-10">
          <Link href={`/${locale}`} className="flex shrink-0 items-center">
            <Logo logoUrl={logoUrl} className="h-9 w-auto text-primary sm:h-11 lg:h-14" />
          </Link>

          <nav className="hidden h-full items-center gap-5 whitespace-nowrap font-sans text-sm lg:flex xl:gap-8">
            <DesktopCategoryMenu transparent={false} active={isShopActive} isOpen={isCategoryOpen} onOpenChange={setIsCategoryOpen} />
            {dynamicMenu && Array.isArray(dynamicMenu) && dynamicMenu.length > 0 ? (
              dynamicMenu.map((item, index) => (
                <Link key={index} href={item.href.startsWith('/') && !item.href.startsWith(`/${locale}`) ? `/${locale}${item.href}` : item.href} className={navigationLinkClass}>
                  {item.label}
                </Link>
              ))
            ) : (
              <Link href={`/${locale}/pages/about-us`} className={navigationLinkClass}>{t("aboutUs")}</Link>
            )}
          </nav>
        </div>

        {/* Right Section: Search & Icons */}
        <div className="flex h-full shrink-0 items-center sm:gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("searchAction")}
              aria-expanded={isSearchOpen}
              aria-controls="storefront-search"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 text-foreground sm:h-12 sm:w-12"
            >
              <Search className="size-[22px]" strokeWidth={1.65} />
            </Button>
            <CartIcon />
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label={session.user.name || t("accountAction")} className="size-10 text-foreground sm:size-12">
                      <User className="size-[22px]" strokeWidth={1.65} />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56 rounded-md bg-card p-1 shadow-lg border-border/50">
                  <DropdownMenuItem className="cursor-pointer py-2.5 text-sm font-medium" render={<Link href={`/${locale}/account/orders`} />}>
                    <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                    {tAccount("sidebarOrders") || "Đơn Mua"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer py-2.5 text-sm font-medium" render={<Link href={`/${locale}/account/profile`} />}>
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    {tAccount("sidebarProfile") || "Tài Khoản Của Tôi"}
                  </DropdownMenuItem>

                  {/* Language Selection inside Dropdown */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer py-2.5 text-sm font-medium flex items-center">
                      <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{tAccount("language") || "Ngôn ngữ"}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {languages.find(l => l.code === locale)?.name}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="rounded-md bg-card min-w-[140px] p-1 shadow-lg border-border/50">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => switchLanguage(lang.code)}
                          className={`cursor-pointer py-2.5 text-sm ${locale === lang.code ? "bg-accent text-accent-foreground font-medium" : ""}`}
                        >
                          {lang.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="cursor-pointer py-2.5 text-sm font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {tAccount("signOut") || "Đăng Xuất"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <LanguageSwitcher />
                <Button variant="ghost" size="icon" aria-label={t("accountAction")} className="size-10 text-foreground sm:size-12" render={<Link href={`/${locale}/login`} />}>
                  <User className="size-[22px]" strokeWidth={1.65} />
                </Button>
              </>
            )}


            {/* Hamburger Menu on Right on Mobile */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("menu")}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-catalogue-menu"
              onClick={() => setIsMobileMenuOpen(true)}
              className="h-10 w-10 text-foreground sm:h-12 sm:w-12 lg:hidden"
            >
              <Menu className="size-6" strokeWidth={1.65} />
            </Button>
            {isMobileMenuOpen && typeof document !== "undefined" && createPortal(
              <div
                id="mobile-catalogue-menu"
                role="dialog"
                aria-modal="true"
                aria-label={t("menu")}
                className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden bg-background font-sans text-foreground animate-in fade-in duration-150 lg:hidden"
              >
                <div className="storefront-container flex h-20 shrink-0 items-center border-b">
                  <Link href={`/${locale}`} onClick={() => setIsMobileMenuOpen(false)}><Logo logoUrl={logoUrl} className="h-11 w-auto text-primary" /></Link>
                  <span className="ml-auto mr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{locale}</span>
                  <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="flex h-11 w-11 items-center justify-center border outline-none hover:border-primary hover:text-primary focus-visible:border-primary" aria-label={t("closeMenu")}><X className="h-5 w-5" /></button>
                </div>
                <MobileCategoryMenu onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>,
              document.body,
            )}
        </div>
      </div>
      {isSearchOpen && (
        <div className="storefront-container pb-3">
          <input
            id="storefront-search"
            type="search"
            aria-label={t("searchAction")}
            placeholder={t("searchPlaceholder")}
            className="h-11 w-full max-w-md rounded-md border bg-white px-3 font-sans text-sm"
          />
        </div>
      )}
    </header>
  )
}
