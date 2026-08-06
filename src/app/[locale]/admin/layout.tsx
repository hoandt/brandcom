import { AppSidebar } from "@/components/admin/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/auth"
import { isAdminEmail } from "@/lib/admin-access"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  if (!isAdmin || !session?.user) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <main className="flex-1 w-full flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-3">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
