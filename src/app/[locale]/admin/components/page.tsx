import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ComponentsClient } from "./components-client"

export default async function AdminComponentsPage() {
  const components = prisma?.dynamicComponent
    ? await prisma.dynamicComponent.findMany({
        orderBy: { createdAt: "desc" },
      })
    : []

  // Normalize JSON data so Next.js can pass it from Server to Client component
  const serializedComponents = components.map((component) => ({
    id: component.id,
    code: component.code,
    name: component.name,
    type: component.type,
    isActive: component.isActive,
    createdAt: component.createdAt.toISOString(),
    updatedAt: component.updatedAt.toISOString(),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dynamic Components</h1>
          <p className="text-xs text-muted-foreground">Manage your store's dynamic UI components like menus and footers.</p>
        </div>
        <Button render={<Link href="/admin/components/new" />} className="h-9 rounded-none px-4 text-xs uppercase font-bold tracking-wider">
          Create Component
        </Button>
      </div>
      <ComponentsClient initialComponents={serializedComponents} />
    </div>
  )
}
