import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { ComponentEditor } from "./component-editor"

export default async function AdminComponentEditorPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params;
  let component = null;

  if (code !== "new") {
    const rawComponent = prisma?.dynamicComponent
      ? await prisma.dynamicComponent.findUnique({
          where: { code },
        })
      : null

    if (!rawComponent) {
      notFound()
    }

    component = {
      id: rawComponent.id,
      code: rawComponent.code,
      name: rawComponent.name,
      type: rawComponent.type,
      content: typeof rawComponent.content === "string" ? JSON.parse(rawComponent.content) : rawComponent.content,
      isActive: rawComponent.isActive,
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {component ? `Edit Component: ${component.name}` : "Create Component"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {component ? "Update the dynamic component settings and content." : "Create a new dynamic component to use in your storefront."}
        </p>
      </div>
      <ComponentEditor initialData={component} />
    </div>
  )
}
