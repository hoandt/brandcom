"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash, ArrowUp, ArrowDown, Check, ChevronsUpDown } from "lucide-react"
import { homepageMediaNames, isHomepageMediaType, type HomepageMediaType } from "@/lib/homepage-media"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { HomepageMediaEditor } from "./homepage-media-editor"
import { ProductPromotionEditor } from "./product-promotion-editor"
import { PRODUCT_PROMOTION_CODE, PRODUCT_PROMOTION_NAME, defaultProductPromotion, validateProductPromotion } from "@/lib/product-promotion"

type ComponentType = {
  id?: string
  code: string
  name: string
  type: string
  content: any
  isActive: boolean
}

// ----------------------------------------------------
// MENU BUILDER
// ----------------------------------------------------
function MenuBuilder({ value, onChange }: { value: any, onChange: (val: any) => void }) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...items, { label: "New Item", href: "#", children: [] }])
  }

  const updateItem = (index: number, key: string, val: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [key]: val }
    onChange(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...items]
    const temp = newItems[index - 1]
    newItems[index - 1] = newItems[index]
    newItems[index] = temp
    onChange(newItems)
  }

  const moveDown = (index: number) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    const temp = newItems[index + 1]
    newItems[index + 1] = newItems[index]
    newItems[index] = temp
    onChange(newItems)
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 border p-4 bg-muted/20">
          <div className="flex flex-col gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => moveUp(index)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => moveDown(index)} disabled={index === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Label (Translation Key or Text)</Label>
                <Input value={item.label} onChange={(e) => updateItem(index, "label", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">URL / Href</Label>
                <Input value={item.href} onChange={(e) => updateItem(index, "href", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" /> Add Menu Item
      </Button>
    </div>
  )
}

// ----------------------------------------------------
// FOOTER BUILDER
// ----------------------------------------------------
function FooterBuilder({ value, onChange }: { value: any, onChange: (val: any) => void }) {
  const columns = Array.isArray(value) ? value : [];

  const addColumn = () => {
    onChange([...columns, { title: "New Column", children: [] }])
  }

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index))
  }

  const updateColumn = (index: number, title: string) => {
    const newCols = [...columns]
    newCols[index].title = title
    onChange(newCols)
  }

  const addLink = (colIndex: number) => {
    const newCols = [...columns]
    newCols[colIndex].children = [...(newCols[colIndex].children || []), { label: "New Link", href: "#" }]
    onChange(newCols)
  }

  const updateLink = (colIndex: number, linkIndex: number, key: string, val: string) => {
    const newCols = [...columns]
    newCols[colIndex].children[linkIndex] = { ...newCols[colIndex].children[linkIndex], [key]: val }
    onChange(newCols)
  }

  const removeLink = (colIndex: number, linkIndex: number) => {
    const newCols = [...columns]
    newCols[colIndex].children = newCols[colIndex].children.filter((_: any, i: number) => i !== linkIndex)
    onChange(newCols)
  }

  return (
    <div className="space-y-6">
      {columns.map((col, cIdx) => (
        <div key={cIdx} className="border p-4 bg-muted/10 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Column Title</Label>
              <Input value={col.title} onChange={(e) => updateColumn(cIdx, e.target.value)} className="mt-1 font-bold" />
            </div>
            <Button type="button" variant="ghost" size="icon" className="text-destructive mt-5" onClick={() => removeColumn(cIdx)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
            {(col.children || []).map((link: any, lIdx: number) => (
              <div key={lIdx} className="flex items-center gap-2">
                <Input placeholder="Label" value={link.label} onChange={(e) => updateLink(cIdx, lIdx, "label", e.target.value)} className="h-8 text-sm" />
                <Input placeholder="URL" value={link.href} onChange={(e) => updateLink(cIdx, lIdx, "href", e.target.value)} className="h-8 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLink(cIdx, lIdx)}>
                  <Trash className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="text-xs mt-2" onClick={() => addLink(cIdx)}>
              <Plus className="mr-1 h-3 w-3" /> Add Link
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={addColumn}>
        <Plus className="mr-2 h-4 w-4" /> Add Footer Column
      </Button>
    </div>
  )
}

// ----------------------------------------------------
// FONT COMBOBOX
// ----------------------------------------------------
function FontCombobox({ value, onChange, fonts, isLoading, defaultFont }: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filteredFonts = fonts 
    ? fonts.filter((f: string) => f.toLowerCase().includes(search.toLowerCase())).slice(0, 50) 
    : []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-9 rounded-md bg-transparent px-3 font-normal"
            disabled={isLoading}
          >
            {value || defaultFont}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search font..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No font found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={defaultFont}
                onSelect={() => {
                  onChange(defaultFont)
                  setOpen(false)
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === defaultFont || !value ? "opacity-100" : "opacity-0")} />
                {defaultFont} (Default)
              </CommandItem>
              {filteredFonts.map((font: string) => (
                <CommandItem
                  key={font}
                  value={font}
                  onSelect={() => {
                    onChange(font)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === font ? "opacity-100" : "opacity-0")} />
                  {font}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ----------------------------------------------------
// TOPBAR BUILDER
// ----------------------------------------------------
function TopbarBuilder({ value, onChange }: { value: any, onChange: (val: any) => void }) {
  const data = value || { text: "", href: "", backgroundColor: "var(--primary)", textColor: "#ffffff", speed: 20 }

  const updateField = (key: string, val: string | number) => {
    onChange({ ...data, [key]: val })
  }

  return (
    <div className="space-y-6 bg-muted/10 p-6 border rounded-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Promotional Text</Label>
          <Input 
            value={data.text || ""} 
            onChange={(e) => updateField("text", e.target.value)} 
            placeholder="e.g. FREE SHIPPING ON ALL ORDERS OVER 500,000 VND"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Link URL (Optional)</Label>
          <Input 
            value={data.href || ""} 
            onChange={(e) => updateField("href", e.target.value)} 
            placeholder="e.g. /vi/categories/sale"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Animation Speed (Seconds)</Label>
          <Input 
            type="number"
            min="5"
            max="120"
            value={data.speed || 20} 
            onChange={(e) => updateField("speed", parseInt(e.target.value) || 20)} 
            placeholder="e.g. 20"
          />
          <p className="text-[10px] text-muted-foreground">Lower is faster, higher is slower.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Background Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={data.backgroundColor?.startsWith("#") ? data.backgroundColor : "#ab212f"} 
              onChange={(e) => updateField("backgroundColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={data.backgroundColor || "var(--primary)"} 
              onChange={(e) => updateField("backgroundColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Text Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={data.textColor?.startsWith("#") ? data.textColor : "#ffffff"} 
              onChange={(e) => updateField("textColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={data.textColor || "#ffffff"} 
              onChange={(e) => updateField("textColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// THEME BUILDER
// ----------------------------------------------------
function ThemeBuilder({ value, onChange }: { value: any, onChange: (val: any) => void }) {
  const theme = value || { primaryColor: "#881337", secondaryColor: "#f4f4f5", typographyColor: "#18181b", headingColor: "#18181b", fontSans: "TikTok Sans", fontHeading: "Old Standard TT", radius: "1rem", logoUrl: "" }

  const updateTheme = (key: string, val: string) => {
    onChange({ ...theme, [key]: val })
  }

  const { data: googleFonts, isLoading: isLoadingFonts } = useQuery({
    queryKey: ["google-fonts"],
    queryFn: async () => {
      const res = await fetch("https://api.fontsource.org/v1/fonts");
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((f: any) => f.type === "google").map((f: any) => f.family).sort() as string[];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-6 border rounded-sm">
        
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Primary Brand Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={theme.primaryColor || "#881337"} 
              onChange={(e) => updateTheme("primaryColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={theme.primaryColor || "#881337"} 
              onChange={(e) => updateTheme("primaryColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Secondary Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={theme.secondaryColor || "#f4f4f5"} 
              onChange={(e) => updateTheme("secondaryColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={theme.secondaryColor || "#f4f4f5"} 
              onChange={(e) => updateTheme("secondaryColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Typography (Text) Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={theme.typographyColor || "#18181b"} 
              onChange={(e) => updateTheme("typographyColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={theme.typographyColor || "#18181b"} 
              onChange={(e) => updateTheme("typographyColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Heading Color</Label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={theme.headingColor || "#18181b"} 
              onChange={(e) => updateTheme("headingColor", e.target.value)}
              className="h-10 w-20 cursor-pointer border-0 p-1 bg-transparent"
            />
            <Input 
              value={theme.headingColor || "#18181b"} 
              onChange={(e) => updateTheme("headingColor", e.target.value)} 
              className="font-mono text-sm"
            />
          </div>
        </div>


        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Logo Image URL</Label>
          <Input 
            type="url" 
            placeholder="https://..." 
            value={theme.logoUrl || ""} 
            onChange={(e) => updateTheme("logoUrl", e.target.value)} 
          />
          <p className="text-[10px] text-muted-foreground">Leave empty to use the default text logo.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Body Font</Label>
          <FontCombobox
            value={theme.fontSans}
            onChange={(val: string) => updateTheme("fontSans", val)}
            fonts={googleFonts}
            isLoading={isLoadingFonts}
            defaultFont="TikTok Sans"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Heading Font</Label>
          <FontCombobox
            value={theme.fontHeading}
            onChange={(val: string) => updateTheme("fontHeading", val)}
            fonts={googleFonts}
            isLoading={isLoadingFonts}
            defaultFont="Merriweather"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Border Radius</Label>
          <select 
            value={theme.radius || "1rem"}
            onChange={(e) => updateTheme("radius", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="0rem">Sharp (0px)</option>
            <option value="0.3rem">Slightly Rounded (~5px)</option>
            <option value="0.5rem">Rounded (~8px)</option>
            <option value="1rem">Very Rounded (16px - Default)</option>
            <option value="2rem">Pill (32px)</option>
          </select>
        </div>

      </div>
    </div>
  )
}

// ----------------------------------------------------
// FEATURED PRODUCTS BUILDER
// ----------------------------------------------------
function FeaturedProductsBuilder({ value, onChange }: { value: any, onChange: (val: any) => void }) {
  const data = value || { title: "", subtitle: "", displayType: "latest", productIds: [], order: 0 };

  const { data: apiData, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products")
      if (!res.ok) throw new Error("Failed to load products")
      return res.json()
    }
  })
  
  const products = apiData?.products || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input 
            value={data.title || ""} 
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="e.g. Featured Products"
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle</Label>
          <Input 
            value={data.subtitle || ""} 
            onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
            placeholder="e.g. Check out our best sellers"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Display Logic</Label>
          <select
            value={data.displayType || "latest"}
            onChange={(e) => onChange({ ...data, displayType: e.target.value, productIds: [] })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="latest">Latest Arrivals</option>
            <option value="manual">Manual Selection</option>
          </select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Order (Position on Homepage)</Label>
          <Input 
            type="number"
            value={data.order ?? 0} 
            onChange={(e) => onChange({ ...data, order: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
        
        {data.displayType === "manual" && (
          <div className="space-y-2 col-span-2">
            <Label>Select Products</Label>
            <div className="border bg-background p-4 max-h-64 overflow-y-auto space-y-3 rounded-md">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading products...</p> : products.length === 0 ? <p className="text-sm text-muted-foreground">No products found.</p> : products.map((p: any) => (
                <label key={p.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded-sm border-primary text-primary focus:ring-primary"
                    checked={data.productIds?.includes(p.id) || false} 
                    onChange={(e) => {
                      const currentIds = data.productIds || []
                      const newIds = e.target.checked 
                        ? [...currentIds, p.id] 
                        : currentIds.filter((id: string) => id !== p.id)
                      onChange({ ...data, productIds: newIds })
                    }} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">Variants: {p.variants?.length || 0}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------
// EDITOR COMPONENT
// ----------------------------------------------------
export function ComponentEditorScreen({ code, preset }: { code: string; preset?: HomepageMediaType }) {
  const isNew = code === "new"
  const query = useQuery({
    queryKey: ["admin-components", code],
    enabled: !isNew,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }): Promise<ComponentType> => {
      const response = await fetch(`/api/admin/components/${encodeURIComponent(code)}`, { signal })
      if (response.status === 404) throw new Error("Component not found.")
      if (!response.ok) throw new Error("Failed to load the component.")
      const data: ComponentType = await response.json()
      if (typeof data.content === "string") {
        try {
          data.content = JSON.parse(data.content)
        } catch {
          // Keep legacy text available in the JSON editor.
        }
      }
      if (code === PRODUCT_PROMOTION_CODE) {
        const { content } = validateProductPromotion(data.content)
        return { ...data, type: PRODUCT_PROMOTION_CODE, content: content ?? defaultProductPromotion }
      }
      return data
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "Create Component" : query.data ? `Edit Component: ${query.data.name}` : "Edit Component"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isNew ? "Create a dynamic component for your storefront." : "Update component settings and content."}
        </p>
      </div>
      {!isNew && query.isPending ? (
        <div role="status" aria-label="Loading component" className="max-w-4xl space-y-4">
          <Skeleton className="h-48 rounded-none" />
          <Skeleton className="h-64 rounded-none" />
        </div>
      ) : !isNew && !query.data ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          <p>{query.error?.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>Retry</Button>
        </div>
      ) : (
        <ComponentEditor key={isNew ? preset ?? "new" : code} initialData={query.data ?? null} preset={isNew ? preset : undefined} />
      )}
    </div>
  )
}

function ComponentEditor({ initialData, preset }: { initialData: ComponentType | null; preset?: HomepageMediaType }) {
  const router = useRouter()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const isNew = !initialData

  const [formData, setFormData] = useState<ComponentType>(
    initialData || {
      code: preset ?? "",
      name: preset ? homepageMediaNames[preset] : "",
      type: preset ?? "menu",
      content: preset ? { items: [] } : [],
      isActive: !preset,
    }
  )

  const [jsonError, setJsonError] = useState("")
  const isHomepageMedia = isHomepageMediaType(formData.type)
  const isProductPromotion = formData.code === PRODUCT_PROMOTION_CODE && !isNew

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const body = new FormData()
      body.set("file", file)
      const response = await fetch("/api/admin/upload", { method: "POST", body })
      const data = await response.json().catch(() => null)
      if (!response.ok || typeof data?.url !== "string") {
        throw new Error(data?.error || "Failed to upload media.")
      }
      return data.url
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: ComponentType): Promise<ComponentType> => {
      const url = isNew ? "/api/admin/components" : `/api/admin/components/${encodeURIComponent(initialData.code)}`
      const method = isNew ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Failed to save")
      }
      return res.json()
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin-components", saved.code], saved)
      void queryClient.invalidateQueries({ queryKey: ["admin-components"], exact: true })
      router.push(`/${locale}/admin/components`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (jsonError || uploadMutation.isPending || saveMutation.isPending) return
    saveMutation.mutate(formData)
  }

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value)
      setFormData({ ...formData, content: parsed })
      setJsonError("")
    } catch (err) {
      setJsonError("Invalid JSON structure")
      // We still update the content temporarily as a string so they can edit
      setFormData({ ...formData, content: e.target.value })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <fieldset disabled={uploadMutation.isPending || saveMutation.isPending} className="min-w-0 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Component Name</Label>
            <Input
              id="name"
              placeholder="e.g. Main Header Navbar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Component Code (Unique)</Label>
            <Input
              id="code"
              placeholder="e.g. main-navbar"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!isNew || isHomepageMedia}
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Component Type</Label>
            <select
              id="type"
              value={formData.type}
              disabled={isProductPromotion || (!isNew && isHomepageMediaType(formData.code))}
              onChange={(e) => {
                const type = e.target.value
                setJsonError("")
                uploadMutation.reset()
                if (isNew && isHomepageMediaType(type)) {
                  setFormData({
                    code: type,
                    type,
                    name: homepageMediaNames[type],
                    content: { items: [] },
                    isActive: false,
                  })
                } else {
                  setFormData({
                    ...formData,
                    code: isNew && isHomepageMedia ? "" : formData.code,
                    type,
                    content: type === "menu" || type === "footer" ? [] : {},
                  })
                }
              }}
              className="h-12 w-full border border-input bg-background px-4 text-sm outline-none focus:border-ring rounded-none"
            >
              <option value="menu">Menu Builder</option>
              <option value="footer">Footer Builder</option>
              <option value="topbar">Topbar Builder</option>
              <option value="theme-settings">Theme Settings</option>
              <option value="hero">Hero Banner</option>
              <option value="featured-products">Featured Products</option>
              {isProductPromotion && <option value={PRODUCT_PROMOTION_CODE}>{PRODUCT_PROMOTION_NAME}</option>}
              {(isNew || isHomepageMediaType(formData.code)) && (
                <>
                  <option value="logo-marquee">{homepageMediaNames["logo-marquee"]}</option>
                  <option value="video-social-preview">{homepageMediaNames["video-social-preview"]}</option>
                </>
              )}
              <option value="custom">Custom (JSON)</option>
            </select>
          </div>
          <div className="space-y-2 flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded-none border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">Active (Visible in Storefront)</span>
            </label>
          </div>
        </div>

        <div className="bg-card border p-6 space-y-4">
          <h2 className="text-lg font-bold">Component Content</h2>

          {isProductPromotion ? (
            <ProductPromotionEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} />
          ) : isHomepageMediaType(formData.type) ? (
            <HomepageMediaEditor
              type={formData.type}
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              onUpload={uploadMutation.mutateAsync}
            />
          ) : formData.type === "menu" ? (
            <MenuBuilder
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
            />
          ) : formData.type === "footer" ? (
            <FooterBuilder
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
            />
          ) : formData.type === "topbar" ? (
            <TopbarBuilder
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
            />
          ) : formData.type === "theme-settings" ? (
            <ThemeBuilder
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
            />
          ) : formData.type === "featured-products" ? (
            <FeaturedProductsBuilder
              value={formData.content}
              onChange={(val) => setFormData({ ...formData, content: val })}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="json-config">JSON Configuration</Label>
              <textarea
                id="json-config"
                className={`font-mono min-h-64 w-full border bg-background p-3 text-xs outline-none focus:border-ring rounded-none ${jsonError ? "border-destructive" : ""}`}
                value={typeof formData.content === 'string' ? formData.content : JSON.stringify(formData.content, null, 2)}
                onChange={handleJsonChange}
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              <p className="text-xs text-muted-foreground">For non-menu components, provide the exact JSON structure required by the frontend.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending || !!jsonError}>
            {saveMutation.isPending ? "Saving..." : isNew ? "Create Component" : "Save Changes"}
          </Button>
        </div>
      </fieldset>
      {uploadMutation.isPending && <p role="status" className="mt-3 text-sm text-muted-foreground">Uploading media…</p>}
      {uploadMutation.isError && <p role="alert" className="mt-3 text-sm text-destructive">{uploadMutation.error.message}</p>}
      {saveMutation.isError && <p role="alert" className="mt-3 text-sm text-destructive">{saveMutation.error.message}</p>}
    </form>
  )
}
