import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EditPageForm } from "./edit-page-form"

interface PageParams {
  params: Promise<{
    id: string
    locale: string
  }>
}

export default async function AdminEditPage({ params }: PageParams) {
  const { id } = await params

  let pageData = null

  if (id !== "new") {
    const page = await prisma.page.findUnique({
      where: { id },
    })

    if (!page) {
      notFound()
    }

    // Normalize JSON format
    pageData = {
      id: page.id,
      slug: page.slug,
      title: (typeof page.title === "string" ? JSON.parse(page.title) : page.title) as Record<string, string>,
      content: (typeof page.content === "string" ? JSON.parse(page.content) : page.content) as any,
      isActive: page.isActive,
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">
        {id === "new" ? "Create Page" : "Edit Page"}
      </h1>
      <EditPageForm initialData={pageData} />
    </div>
  )
}
