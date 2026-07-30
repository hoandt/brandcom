"use client";

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { ShoppingBag, Search, Menu, Heart, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useTranslations, useLocale } from "next-intl"
import { LanguageSwitcher } from "./language-switcher"
import { CartIcon } from "./cart-icon"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const t = useTranslations("Navbar")
  const locale = useLocale()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isHomepage = pathname === `/${locale}` || pathname === "/"
  const isTransparent = isHomepage && !isScrolled

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isTransparent
        ? "bg-gradient-to-b from-slate-500/10 to-transparent border-transparent"
        : "bg-background/90 backdrop-blur-md border-b border-border shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
        }`}
    >
      <div className={`container mx-auto flex h-20 items-center justify-between px-4 md:px-8 transition-colors duration-300 ${isTransparent ? "text-white" : "text-foreground"}`}>

        {/* Left Section: Logo & Desktop Links */}
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                  </Button>
                }
              />
              <SheetContent side="left" className="font-heading uppercase tracking-widest text-foreground">
                <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
                <nav className="grid gap-6 text-lg font-medium mt-12">
                  <Link href={`/${locale}`} className="flex items-center mb-6">
                    <Logo className="h-10 w-auto text-primary" />
                  </Link>
                  <Link href={`/${locale}/collections/new`} className="hover:text-primary transition-colors">{t("newArrivals")}</Link>
                  <Link href={`/${locale}/collections/all`} className="hover:text-primary transition-colors">{t("allProducts")}</Link>
                  <Link href={`/${locale}/about`} className="hover:text-primary transition-colors">{t("aboutUs")}</Link>
                </nav>
              </SheetContent>
            </Sheet>
            <Link href={`/${locale}`} className="flex items-center">
              <Logo className={`h-12 md:h-14 w-auto ${isTransparent ? "text-white" : "text-primary"}`} />
            </Link>
          </div>

          <nav className="hidden md:flex gap-8 text-[0.85rem] font-bold uppercase tracking-[0.15em]">
            <Link href={`/${locale}/collections/new`} className={`${isTransparent ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground"} hover:underline underline-offset-[12px] transition-all decoration-2`}>{t("newArrivals")}</Link>
            <Link href={`/${locale}/collections/all`} className={`${isTransparent ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground"} hover:underline underline-offset-[12px] transition-all decoration-2`}>{t("allProducts")}</Link>
            <Link href={`/${locale}/about`} className={`${isTransparent ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground"} hover:underline underline-offset-[12px] transition-all decoration-2`}>{t("aboutUs")}</Link>
          </nav>
        </div>

        {/* Right Section: Search & Icons */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Search Pill (Desktop) */}
          <div className={`hidden lg:flex items-center rounded-full px-4 h-11 w-[320px] transition-all ${isTransparent
            ? "bg-white/20 text-white focus-within:bg-white/30"
            : "bg-secondary text-foreground focus-within:ring-1 focus-within:ring-primary/20"
            }`}>
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className={`bg-transparent border-none outline-none text-sm w-full ${isTransparent ? "placeholder:text-white/70" : "placeholder:text-muted-foreground/70"}`}
            />
            <Search className={`h-4 w-4 shrink-0 ${isTransparent ? "text-white" : "text-muted-foreground"}`} />
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <LanguageSwitcher isTransparent={isTransparent} />
            <Button variant="ghost" size="icon" aria-label="Search" className={`lg:hidden ${isTransparent ? "text-white hover:text-white hover:bg-white/20" : "text-foreground"}`}>
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Wishlist" className={`hidden sm:inline-flex ${isTransparent ? "text-white hover:text-white hover:bg-white/20" : "text-foreground"}`}>
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Account" className={`hidden sm:inline-flex ${isTransparent ? "text-white hover:text-white hover:bg-white/20" : "text-foreground"}`}>
              <User className="h-5 w-5" />
            </Button>
            <CartIcon isTransparent={isTransparent} />
          </div>
        </div>
      </div>
    </header>
  )
}
