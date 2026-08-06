import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { marked } from "marked"

interface PageParams {
  params: Promise<{
    slug: string
    locale: string
  }>
}

export default async function StorePage({ params }: PageParams) {
  const { slug, locale } = await params

  const page = await prisma.page.findUnique({
    where: { slug, isActive: true },
  })

  if (!page) {
    notFound()
  }

  // Parse JSON title
  const titleMap = (typeof page.title === "string" ? JSON.parse(page.title) : page.title) as Record<string, string>
  const title = titleMap[locale] || titleMap["en"] || Object.values(titleMap)[0] || "Untitled"

  // Parse JSON sections content
  const sections = (typeof page.content === "string" ? JSON.parse(page.content) : page.content) as any[]

  // Parse markdown to HTML asynchronously for all columns in all sections
  const parsedSections = await Promise.all(
    sections.map(async (section: any) => {
      const parsedColumns = await Promise.all(
        section.columns.map(async (column: any) => {
          const mdContent = column.content[locale] || column.content["en"] || Object.values(column.content)[0] || "";
          const html = await marked.parse(mdContent);
          return {
            ...column,
            html,
          };
        })
      );
      return {
        ...section,
        columns: parsedColumns,
      };
    })
  );

  return (
    <div className="container mx-auto py-16 px-4 md:px-8 max-w-6xl min-h-[60vh]">
      {/* Page Title */}
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-heading uppercase tracking-widest">
          {title}
        </h1>
      </div>

      {/* Page Sections Layout */}
      <div className="space-y-16">
        {parsedSections.map((section: any, idx: number) => (
          <div key={section.id || idx} className="grid grid-cols-12 gap-8 items-center">
            {section.columns.map((column: any, colIdx: number) => {
              // Map spans to responsive md:col-span
              let colSpanClass = "col-span-12"
              if (column.span === 6) colSpanClass = "col-span-12 md:col-span-6"
              else if (column.span === 4) colSpanClass = "col-span-12 md:col-span-4"
              else if (column.span === 8) colSpanClass = "col-span-12 md:col-span-8"

              return (
                <div
                  key={colIdx}
                  className={`${colSpanClass} prose dark:prose-invert max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wider prose-p:text-foreground/90 prose-p:font-light prose-img:rounded-2xl prose-img:shadow-md prose-img:w-full prose-img:max-h-[450px] prose-img:object-cover`}
                  dangerouslySetInnerHTML={{ __html: column.html }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
