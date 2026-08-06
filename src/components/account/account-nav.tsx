"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, ShoppingBag, MapPin, Ticket, Bell } from "lucide-react"

interface AccountNavProps {
  locale: string;
  translations: {
    profile: string;
    orders: string;
    addresses: string;
    vouchers: string;
    notifications: string;
  }
}

export function AccountNav({ locale, translations }: AccountNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: translations.orders,
      href: `/${locale}/account/orders`,
      icon: ShoppingBag,
      exact: false
    },
    {
      title: translations.profile,
      href: `/${locale}/account/profile`,
      icon: User,
      exact: false
    },
    {
      title: translations.addresses,
      href: `/${locale}/account/addresses`,
      icon: MapPin,
      exact: false
    },
    {
      title: translations.vouchers,
      href: `/${locale}/account/vouchers`,
      icon: Ticket,
      exact: false
    },
    {
      title: translations.notifications,
      href: `/${locale}/account/notifications`,
      icon: Bell,
      exact: false
    },
  ]

  return (
    <nav className="flex border-b border-border overflow-x-auto hide-scrollbar whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 gap-1 sm:gap-4 bg-card sm:bg-transparent">
      {navItems.map((item, index) => {
        const Icon = item.icon
        // Check active state
        const isActive = item.exact
          ? pathname === item.href || pathname === `${item.href}/`
          : pathname.startsWith(item.href)

        return (
          <Link
            key={index}
            href={item.href}
            className={`flex items-center gap-1.5 px-2.5 py-3 border-b text-xs sm:text-sm font-medium transition-all ${
              isActive
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
