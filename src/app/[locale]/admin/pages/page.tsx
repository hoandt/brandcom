import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PagesClient } from "./pages-client"

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Normalize JSON data so Next.js can pass it from Server to Client component
  const serializedPages = pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    title: typeof page.title === "string" ? JSON.parse(page.title) : page.title,
    content: typeof page.content === "string" ? JSON.parse(page.content) : page.content,
    isActive: page.isActive,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="text-xs text-muted-foreground">Manage your store content pages.</p>
        </div>
        <Button render={<Link href="/admin/pages/new" />} className="h-9 rounded-none px-4 text-xs uppercase font-bold tracking-wider">
          Create Page
        </Button>
      </div>
      <PagesClient initialPages={serializedPages} />
    </div>
  )
}
