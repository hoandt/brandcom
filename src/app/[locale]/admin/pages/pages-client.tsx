"use client"

import { useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trash2, Edit } from "lucide-react"

interface PageData {
  id: string
  slug: string
  title: Record<string, string>
  content: Record<string, string>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PagesClientProps {
  initialPages: PageData[]
}

export function PagesClient({ initialPages }: PagesClientProps) {
  const [pages, setPages] = useState<PageData[]>(initialPages)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const locale = useLocale()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return
    setDeletingId(id)

    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setPages((prev) => prev.filter((page) => page.id !== id))
      } else {
        const err = await res.json()
        alert(err.error || "Failed to delete page")
      }
    } catch (err) {
      console.error(err)
      alert("Something went wrong. Failed to delete page.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-none border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-bold uppercase tracking-wider">Title ({locale.toUpperCase()})</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">Slug</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">
                No pages found.
              </TableCell>
            </TableRow>
          ) : (
            pages.map((page) => {
              const displayTitle = page.title[locale] || page.title["en"] || Object.values(page.title)[0] || "Untitled"

              return (
                <TableRow key={page.id} className="hover:bg-muted/10">
                  <TableCell className="font-bold text-xs py-2">
                    <Link href={`/admin/pages/${page.id}`} className="hover:underline hover:text-primary transition-colors">
                      {displayTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2">
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded-none font-mono">{page.slug}</code>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border ${
                      page.isActive
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}>
                      {page.isActive ? "Active" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        render={<Link href={`/admin/pages/${page.id}`} />}
                        variant="ghost"
                        size="icon-xs"
                        className="h-7 w-7 rounded-none"
                        title="Edit Page"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(page.id)}
                        disabled={deletingId === page.id}
                        variant="ghost"
                        size="icon-xs"
                        className="h-7 w-7 rounded-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
