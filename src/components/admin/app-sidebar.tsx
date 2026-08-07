"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Package, LayoutDashboard, ShoppingCart, Users, Tag, Settings, FileText, LogOut, ChevronUp, Warehouse, FolderTree, MessageSquareText } from "lucide-react"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"

const items = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/admin/products",
    icon: Package,
  },
  {
    title: "",
    url: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Pages",
    url: "/admin/pages",
    icon: FileText,
  },
  {
    title: "Customers",
    url: "/admin/customers",
    icon: Users,
  },
  {
    title: "Discounts",
    url: "/admin/discounts",
    icon: Tag,
  },
  {
    title: "Reviews",
    url: "/admin/reviews",
    icon: MessageSquareText,
  },
  {
    title: "Warehouses",
    url: "/admin/warehouses",
    icon: Warehouse,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
]

export function AppSidebar({ user }: { user?: { name?: string | null; email?: string | null; image?: string | null } }) {
  const locale = useLocale();
  const categoryT = useTranslations("AdminCategories");
  const { data } = useQuery<{ settings: { storeName: string } }>({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to load store settings");
      return response.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const storeName = data?.settings.storeName || "Store";

  return (
    <Sidebar className="border-r border-border rounded-none">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{storeName} Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton render={<Link href={`/${locale}${item.url}`} />} className="rounded-none h-8 text-xs hover:bg-muted/50 transition-colors">
                    <item.icon className="w-3.5 h-3.5 mr-2" />
                    <span className="font-medium">{item.url === "/admin/categories" ? categoryT("title") : item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border bg-muted/20">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton render={<DropdownMenuTrigger />} className="h-12 w-full justify-start gap-2 rounded-none px-2 hover:bg-muted/50 transition-colors cursor-pointer">
                  <Avatar className="h-7 w-7 rounded-none border border-border">
                    <AvatarImage src={user?.image || ""} alt={user?.name || "Admin"} />
                    <AvatarFallback className="rounded-none bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                      {user?.name?.[0] || user?.email?.[0] || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left flex-1 overflow-hidden">
                    <span className="text-[11px] font-bold leading-none truncate w-full">
                      {user?.name || `${storeName} Admin`}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate w-full mt-0.5 uppercase tracking-wide">
                      {user?.email || "admin@store.com"}
                    </span>
                  </div>
                  <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto" />
                </SidebarMenuButton>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width] rounded-none border-border shadow-none"
              >
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-none text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
