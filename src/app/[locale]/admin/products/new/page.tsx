"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { MarkdownEditor } from "@/components/admin/markdown-editor"

// Port of slugify utility for client-side use
function clientSlugify(text: string): string {
  if (!text) return "";
  let str = text.toLowerCase();
  str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
  str = str.replace(/[èéẹẻẽêềếệểễ]/g, "e");
  str = str.replace(/[ìíịỉĩ]/g, "i");
  str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
  str = str.replace(/[ùúụủũưừứựửữ]/g, "u");
  str = str.replace(/[ỳýỵỷỹ]/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return str
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

interface VariantInput {
  name: string
  sku: string
  price: string
  stock: string
  imageFile?: File | null
  imagePreview?: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  
  // Track details fields states locally
  const [description, setDescription] = useState("")
  const [overview, setOverview] = useState("")
  const [materials, setMaterials] = useState("")
  const [care, setCare] = useState("")
  
  // Dynamic variants state. Starts with one default variant
  const [variants, setVariants] = useState<VariantInput[]>([
    { name: "Default", sku: "", price: "0.00", stock: "10", imageFile: null, imagePreview: "" }
  ])

  // Auto-slugify name
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      const generatedSlug = clientSlugify(name);
      setSlug(generatedSlug);
      
      // Also auto-populate default variant SKU if it hasn't been edited
      setVariants((prev) => {
        const updated = [...prev];
        if (updated[0] && updated[0].sku === "" || updated[0].sku.startsWith(clientSlugify(name))) {
          updated[0].sku = generatedSlug ? `${generatedSlug}-default` : "";
        }
        return updated;
      });
    }
  }, [name, isSlugManuallyEdited]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles]);

      const previews = selectedFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Add a new empty variant
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { name: "", sku: slug ? `${slug}-${prev.length + 1}` : "", price: "0.00", stock: "0", imageFile: null, imagePreview: "" }
    ])
  }

  // Remove a variant
  const removeVariant = (index: number) => {
    if (variants.length === 1) {
      alert("At least one variant is required.")
      return
    }
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle variant input changes
  const handleVariantChange = (index: number, field: keyof VariantInput, value: any) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Handle variant image picker
  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const preview = URL.createObjectURL(file)
      handleVariantChange(index, "imageFile", file)
      handleVariantChange(index, "imagePreview", preview)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    // Form validations
    if (variants.some(v => !v.name || !v.sku || !v.price || !v.stock)) {
      alert("Please fill in all variant details.")
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set("slug", slug)
    formData.set("description", description)
    formData.set("overview", overview)
    formData.set("materials", materials)
    formData.set("care", care)

    // Append variants array as JSON string
    formData.append("variants", JSON.stringify(variants.map(v => ({
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price),
      stock: parseInt(v.stock)
    }))))

    // Append main product images
    formData.delete("images")
    images.forEach((file) => {
      formData.append("images", file)
    })

    // Append specific variant image files
    variants.forEach((v, index) => {
      if (v.imageFile) {
        formData.append(`variantImage_${index}`, v.imageFile)
      }
    })

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        router.push("/admin/products")
        router.refresh()
      } else {
        const errData = await res.json()
        alert(errData.error || "Failed to create product")
      }
    } catch (e) {
      console.error(e)
      alert("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-2">Create Product</h1>
        <p className="text-muted-foreground font-light text-sm">Add a new item with variants, custom SKUs, and SEO details</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 bg-card p-8 rounded-xl border border-border shadow-sm">
        {/* Name */}
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-xs uppercase tracking-widest">Product Name</Label>
          <Input 
            id="name" 
            name="name" 
            required 
            placeholder="e.g. Áo Thun Cotton Premium" 
            className="h-12"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Slug */}
        <div className="grid gap-2">
          <Label htmlFor="slug" className="text-xs uppercase tracking-widest">Slug</Label>
          <Input 
            id="slug" 
            name="slug" 
            required 
            placeholder="e.g. ao-thun-cotton-premium" 
            className="h-12"
            value={slug}
            onChange={(e) => {
              setIsSlugManuallyEdited(true)
              setSlug(e.target.value)
            }}
          />
        </div>

        {/* Description */}
        <MarkdownEditor
          id="description"
          name="description"
          label="Description"
          placeholder="Main product introduction..."
          value={description}
          onChange={setDescription}
          rows={3}
        />

        {/* Overview */}
        <MarkdownEditor
          id="overview"
          name="overview"
          label="Product Overview (Highlights)"
          placeholder="- 100% fine cotton yarn&#10;- Relaxed raglan silhouette&#10;- Soft and breathable fabric"
          value={overview}
          onChange={setOverview}
          rows={3}
        />

        {/* Materials */}
        <MarkdownEditor
          id="materials"
          name="materials"
          label="Materials"
          placeholder="e.g. 100% Mulberry Silk, 22 Momme"
          value={materials}
          onChange={setMaterials}
          rows={2}
        />

        {/* Care */}
        <MarkdownEditor
          id="care"
          name="care"
          label="Care Instructions"
          placeholder="e.g. Machine wash cold, line dry, iron low"
          value={care}
          onChange={setCare}
          rows={2}
        />

        {/* Dynamic Variants Section */}
        <div className="grid gap-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest">Product Variants</h3>
            <Button type="button" onClick={addVariant} variant="outline" size="xs">
              + Add Variant
            </Button>
          </div>

          <div className="space-y-4">
            {variants.map((v, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 border border-border rounded-lg bg-accent/20 relative">
                {/* Variant Image Upload */}
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-[10px] uppercase tracking-widest">Image</Label>
                  <div className="relative border border-border rounded h-10 w-full overflow-hidden bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer">
                    {v.imagePreview ? (
                      <img src={v.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Pick</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => handleVariantImageChange(index, e)}
                    />
                  </div>
                </div>

                <div className="col-span-3 grid gap-1.5">
                  <Label className="text-[10px] uppercase tracking-widest">Variant Name</Label>
                  <Input
                    required
                    value={v.name}
                    onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                    placeholder="e.g. Small / Red"
                    className="h-10"
                  />
                </div>
                <div className="col-span-3 grid gap-1.5">
                  <Label className="text-[10px] uppercase tracking-widest">SKU</Label>
                  <Input
                    required
                    value={v.sku}
                    onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                    placeholder="e.g. SKU-123"
                    className="h-10"
                  />
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label className="text-[10px] uppercase tracking-widest">Price ($)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={v.price}
                    onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                    placeholder="29.00"
                    className="h-10"
                  />
                </div>
                <div className="col-span-1 grid gap-1.5">
                  <Label className="text-[10px] uppercase tracking-widest">Stock</Label>
                  <Input
                    required
                    type="number"
                    value={v.stock}
                    onChange={(e) => handleVariantChange(index, "stock", e.target.value)}
                    placeholder="10"
                    className="h-10"
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-destructive hover:text-destructive/80 text-sm font-semibold h-10 w-10 flex items-center justify-center rounded-full hover:bg-destructive/10"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Images Upload */}
        <div className="grid gap-2 pt-4 border-t border-border">
          <Label className="text-xs uppercase tracking-widest">Product Images</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/30 transition-colors cursor-pointer relative">
            <input
              type="file"
              id="images"
              name="images"
              multiple
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleImageChange}
            />
            <p className="text-sm text-muted-foreground font-light">
              Drag & drop images here or <span className="text-primary font-medium hover:underline">browse</span>
            </p>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group border border-border rounded-lg overflow-hidden aspect-square bg-muted">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="mt-4 h-12 uppercase tracking-widest text-xs">
          {loading ? "Saving..." : "Create Product"}
        </Button>
      </form>
    </div>
  )
}
