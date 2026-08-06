"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownEditor } from "@/components/admin/markdown-editor"
import { ArrowUp, ArrowDown, Trash2, Plus, Columns } from "lucide-react"

interface Column {
  span: number
  content: Record<string, string>
}

interface Section {
  id: string
  layout: string
  columns: Column[]
}

interface PageData {
  id: string
  slug: string
  title: Record<string, string>
  content: Section[]
  isActive: boolean
}

interface EditPageFormProps {
  initialData: PageData | null
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "th", name: "ไทย" },
]

const LAYOUT_PRESETS = [
  { name: "Full Width (12/12)", value: "1-col", spans: [12] },
  { name: "Half & Half (6/6)", value: "2-col-equal", spans: [6, 6] },
  { name: "1/3 & 2/3 (4/8)", value: "2-col-split-left", spans: [4, 8] },
  { name: "2/3 & 1/3 (8/4)", value: "2-col-split-right", spans: [8, 4] },
  { name: "Three Columns (4/4/4)", value: "3-col", spans: [4, 4, 4] },
]

export function EditPageForm({ initialData }: EditPageFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeLang, setActiveLang] = useState("en")

  const [slug, setSlug] = useState(initialData?.slug || "")
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [titles, setTitles] = useState<Record<string, string>>({
    en: initialData?.title?.en || "",
    vi: initialData?.title?.vi || "",
    th: initialData?.title?.th || "",
  })

  // Normalize initial content to section structure
  const initialSections: Section[] = Array.isArray(initialData?.content)
    ? initialData.content
    : [
        {
          id: "default-sec",
          layout: "1-col",
          columns: [
            {
              span: 12,
              content: { en: "", vi: "", th: "" }
            }
          ]
        }
      ]

  const [sections, setSections] = useState<Section[]>(initialSections)

  const handleTitleChange = (lang: string, value: string) => {
    setTitles((prev) => ({ ...prev, [lang]: value }))
    if (!initialData && lang === "en" && !slug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
        .replace(/[ìíịỉĩ]/g, "i")
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
        .replace(/[ùúụủũưừứựửữ]/g, "u")
        .replace(/[ỳýỵỷỹ]/g, "y")
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "")
      setSlug(generatedSlug)
    }
  }

  const addSection = (layoutType: string = "1-col") => {
    const preset = LAYOUT_PRESETS.find(p => p.value === layoutType) || LAYOUT_PRESETS[0]
    const newSection: Section = {
      id: `section-${Date.now()}`,
      layout: preset.value,
      columns: preset.spans.map(span => ({
        span,
        content: { en: "", vi: "", th: "" }
      }))
    }
    setSections(prev => [...prev, newSection])
  }

  const deleteSection = (index: number) => {
    if (sections.length === 1) {
      alert("At least one section is required.")
      return
    }
    setSections(prev => prev.filter((_, i) => i !== index))
  }

  const moveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === sections.length - 1) return

    const targetIndex = direction === "up" ? index - 1 : index + 1
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setSections(updated)
  }

  const handleLayoutChange = (index: number, layoutType: string) => {
    const preset = LAYOUT_PRESETS.find(p => p.value === layoutType) || LAYOUT_PRESETS[0]
    const currentSection = sections[index]

    // Remap columns, retaining as much existing content as possible
    const updatedColumns = preset.spans.map((span, colIdx) => {
      const existingCol = currentSection.columns[colIdx]
      return {
        span,
        content: existingCol ? { ...existingCol.content } : { en: "", vi: "", th: "" }
      }
    })

    const updated = [...sections]
    updated[index] = {
      ...currentSection,
      layout: layoutType,
      columns: updatedColumns
    }
    setSections(updated)
  }

  const handleColumnContentChange = (secIdx: number, colIdx: number, lang: string, val: string) => {
    const updated = [...sections]
    updated[secIdx].columns[colIdx].content[lang] = val
    setSections(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug) {
      alert("Slug is required")
      return
    }

    setLoading(true)
    const url = initialData
      ? `/api/admin/pages/${initialData.id}`
      : "/api/admin/pages"
    const method = initialData ? "PUT" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: titles,
          content: sections,
          isActive,
        }),
      })

      if (res.ok) {
        router.push("/admin/pages")
        router.refresh()
      } else {
        const err = await res.json()
        alert(err.error || "Failed to save page")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to save page. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-card p-4 border rounded-none shadow-none space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-widest font-bold">Page Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
              placeholder="e.g. about-us"
              required
              className="bg-secondary/30 h-9 rounded-none"
            />
            <p className="text-[11px] text-muted-foreground">Used in URL: /pages/&lt;slug&gt;</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 pt-8">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-xs uppercase tracking-widest font-heading font-medium cursor-pointer">
              Published (Visible on storefront)
            </label>
          </div>
        </div>

        {/* Language Switcher Tabs */}
        <div className="border-b border-border flex gap-4">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveLang(lang.code)}
              className={`pb-2 text-xs uppercase tracking-widest font-medium border-b-2 transition-all ${
                activeLang === lang.code
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>

        {/* Page Title Input per Language */}
        {LANGUAGES.map((lang) => {
          if (lang.code !== activeLang) return null
          return (
            <div key={lang.code} className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-bold">Page Title ({lang.name})</label>
              <Input
                value={titles[lang.code] || ""}
                onChange={(e) => handleTitleChange(lang.code, e.target.value)}
                placeholder={`Title in ${lang.name}`}
                className="bg-secondary/30 h-9 rounded-none"
              />
            </div>
          )
        })}
      </div>

      {/* Page Sections Layout Builder */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest">Layout Sections</h2>
          <Button type="button" onClick={() => addSection("1-col")} size="sm" className="h-8 rounded-none text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Section
          </Button>
        </div>

        {sections.map((section, secIdx) => (
          <div key={section.id} className="bg-card border rounded-none shadow-none overflow-hidden">
            {/* Section Controls Toolbar */}
            <div className="bg-muted/40 px-3 py-2 border-b flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Section {secIdx + 1}</span>
                <div className="flex items-center bg-background border rounded-none px-2 py-1 gap-2">
                  <Columns className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={section.layout}
                    onChange={(e) => handleLayoutChange(secIdx, e.target.value)}
                    className="text-xs bg-transparent border-none outline-none font-medium text-foreground cursor-pointer"
                  >
                    {LAYOUT_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>{preset.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reordering and deleting */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => moveSection(secIdx, "up")}
                  disabled={secIdx === 0}
                  variant="ghost"
                  size="icon-xs"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => moveSection(secIdx, "down")}
                  disabled={secIdx === sections.length - 1}
                  variant="ghost"
                  size="icon-xs"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={() => deleteSection(secIdx)}
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Column Editors based on Selected layout */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {section.columns.map((column, colIdx) => {
                  // Determine column span class based on layout preset
                  // Standard mapping from col span to lg class span
                  let lgSpanClass = "lg:col-span-12"
                  if (column.span === 6) lgSpanClass = "lg:col-span-6"
                  else if (column.span === 4) lgSpanClass = "lg:col-span-4"
                  else if (column.span === 8) lgSpanClass = "lg:col-span-8"

                  return (
                    <div key={colIdx} className={`col-span-12 ${lgSpanClass} space-y-2 border border-border/60 p-3 rounded-none bg-secondary/10`}>
                      <div className="flex justify-between items-center border-b pb-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Column {colIdx + 1} (Span {column.span}/12)
                        </span>
                      </div>

                      <MarkdownEditor
                        id={`content-${section.id}-${colIdx}-${activeLang}`}
                        name={`content-${section.id}-${colIdx}-${activeLang}`}
                        value={column.content[activeLang] || ""}
                        onChange={(val) => handleColumnContentChange(secIdx, colIdx, activeLang, val)}
                        rows={column.span === 12 ? 8 : 12}
                        placeholder={`Write content for Column ${colIdx + 1} in ${LANGUAGES.find(l => l.code === activeLang)?.name}...`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Save Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button type="submit" disabled={loading} className="h-8 rounded-none px-4 text-[11px] uppercase font-bold tracking-wider">
          {loading ? "Saving..." : "Save Page"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-none px-4 text-[11px] uppercase font-bold tracking-wider"
          onClick={() => router.push("/admin/pages")}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
