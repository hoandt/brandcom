"use client";

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"
import { Search, Menu, User, ChevronDown, Globe, X } from "lucide-react"
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

export function Navbar({ session }: { session: Session | null }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("Navbar")
  const tAccount = useTranslations("Account")
  const locale = useLocale()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
  const isTransparent = isHomepage && !isScrolled
  const isShopActive = ["/collections/", "/categories/", "/products/"].some((segment) => pathname.includes(segment))

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isTransparent
        ? "bg-gradient-to-b from-slate-500/10 to-transparent border-transparent"
        : "bg-background/70 backdrop-blur-xl border-b border-border/50 shadow-sm"
        }`}
    >
      <div className={`storefront-container flex h-20 items-center justify-between transition-colors duration-300 ${isTransparent ? "text-white" : "text-foreground"}`}>

        {/* Left Section: Logo & Desktop Links */}
        <div className="flex items-center gap-10">
          <Link href={`/${locale}`} className="flex items-center">
            <Logo className={`h-12 md:h-14 w-auto ${isTransparent ? "text-white" : "text-primary"}`} />
          </Link>

          <nav className="hidden h-20 items-center gap-8 whitespace-nowrap text-[0.85rem] font-bold uppercase tracking-[0.15em] md:flex">
            <DesktopCategoryMenu transparent={isTransparent} active={isShopActive} />
            <Link href={`/${locale}/pages/about-us`} className={`${isTransparent ? "text-white/90 hover:text-white" : "text-muted-foreground hover:text-foreground"} border-b-2 border-transparent py-3 font-heading text-[0.85rem] font-bold uppercase tracking-[0.15em] outline-none transition-colors hover:border-current focus-visible:outline-none focus-visible:ring-0`}>{t("aboutUs")}</Link>
          </nav>
        </div>

        {/* Right Section: Search & Icons */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Search Pill */}
          <div className={`flex items-center rounded-full transition-all duration-300 overflow-hidden ${isSearchOpen ? "w-[180px] sm:w-[280px] px-4 h-11" : "w-0 px-0 h-11 pointer-events-none"
            } ${isTransparent
              ? "bg-white/20 text-white focus-within:bg-white/30"
              : "bg-secondary text-foreground focus-within:ring-1 focus-within:ring-primary/20"
            }`}>
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className={`bg-transparent border-none outline-none text-sm w-full ${isTransparent ? "placeholder:text-white/70" : "placeholder:text-muted-foreground/70"}`}
            />
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`${isTransparent ? "text-white hover:text-white hover:bg-white/20" : "text-foreground"}`}
            >
              <Search className="h-5 w-5" />
            </Button>
            <CartIcon isTransparent={isTransparent} />
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button className={`flex items-center gap-1 px-2 py-1 outline-none cursor-pointer rounded-none hover:bg-muted/10 ${isTransparent ? "text-white" : "text-foreground"}`}>
                      <div className="w-5 h-5 rounded-none bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] uppercase overflow-hidden shrink-0 border border-primary/20">
                        {session.user.image ? (
                          <Image src={session.user.image} alt={session.user.name || "User"} width={20} height={20} unoptimized className="h-full w-full object-cover" />
                        ) : (
                          session.user.name?.charAt(0) || "U"
                        )}
                      </div>
                      <span className="max-w-[100px] truncate text-xs font-medium">{session.user.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44 rounded-none bg-card">
                  <DropdownMenuItem className="rounded-none cursor-pointer text-xs" render={<Link href={`/${locale}/account/orders`} />}>
                    {tAccount("sidebarOrders") || "Đơn Mua"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-none cursor-pointer text-xs" render={<Link href={`/${locale}/account/profile`} />}>
                    {tAccount("sidebarProfile") || "Tài Khoản Của Tôi"}
                  </DropdownMenuItem>


                  {/* Language Selection inside Dropdown */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="rounded-none text-xs cursor-pointer">
                      <Globe className="w-3.5 h-3.5 mr-1" />
                      <span>{tAccount("language") || "Ngôn ngữ"}</span>
                      <span className="ml-auto text-muted-foreground text-[10px] mr-1">
                        {languages.find(l => l.code === locale)?.name}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="rounded-none bg-card min-w-[120px]">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => switchLanguage(lang.code)}
                          className={`rounded-none text-xs cursor-pointer ${locale === lang.code ? "bg-accent text-accent-foreground" : ""}`}
                        >
                          {lang.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-none cursor-pointer text-destructive text-xs focus:bg-destructive/5 focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  >
                    {tAccount("signOut") || "Đăng Xuất"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <LanguageSwitcher isTransparent={isTransparent} />
                <Link href={`/${locale}/login`}>
                  <Button variant="ghost" size="icon" aria-label="Account" className={`hidden sm:inline-flex ${isTransparent ? "text-white hover:text-white hover:bg-white/20" : "text-foreground"}`}>
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
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
              className="md:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            {isMobileMenuOpen && typeof document !== "undefined" && createPortal(
              <div
                id="mobile-catalogue-menu"
                role="dialog"
                aria-modal="true"
                aria-label={t("menu")}
                className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden bg-background font-heading text-foreground animate-in fade-in duration-150 md:hidden"
              >
                <div className="storefront-container flex h-20 shrink-0 items-center border-b">
                  <Link href={`/${locale}`} onClick={() => setIsMobileMenuOpen(false)}><Logo className="h-11 w-auto text-primary" /></Link>
                  <span className="ml-auto mr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{locale}</span>
                  <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="flex h-11 w-11 items-center justify-center border outline-none hover:border-primary hover:text-primary focus-visible:border-primary" aria-label={t("closeMenu")}><X className="h-5 w-5" /></button>
                </div>
                <MobileCategoryMenu onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>,
              document.body,
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
