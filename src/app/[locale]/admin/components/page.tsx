import { ComponentsClient } from "./components-client"

export default function AdminComponentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dynamic Components</h1>
        <p className="text-xs text-muted-foreground">Manage storefront navigation, homepage media, and other dynamic sections.</p>
      </div>
      <ComponentsClient />
    </div>
  )
}
