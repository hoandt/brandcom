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
  id?: string
  name: string
  sku: string
  price: string
  stock: string
  imageUrl?: string
  imageFile?: File | null
  imagePreview?: string
}

interface EditProductFormProps {
  initialData: {
    id: string
    name: string
    slug: string
    description: string
    overview: string
    materials: string
    care: string
    images: string[]
    variants: {
      id: string
      name: string
      sku: string
      price: number
      stock: number
      imageUrl: string
    }[]
  }
}

export default function EditProductForm({ initialData }: EditProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState(initialData.name)
  const [slug, setSlug] = useState(initialData.slug)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(true)
  const [description, setDescription] = useState(initialData.description)
  const [overview, setOverview] = useState(initialData.overview)
  const [materials, setMaterials] = useState(initialData.materials)
  const [care, setCare] = useState(initialData.care)

  // Track existing image URLs that are KEPT
  const [existingImages, setExistingImages] = useState<string[]>(initialData.images)
  
  // Track new uploaded images
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])

  // Dynamic variants state (pre-populated)
  const [variants, setVariants] = useState<VariantInput[]>(
    initialData.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price.toFixed(2),
      stock: v.stock.toString(),
      imageUrl: v.imageUrl,
      imageFile: null,
      imagePreview: ""
    }))
  )

  // Auto-slugify when name changes
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(clientSlugify(name));
    }
  }, [name, isSlugManuallyEdited]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setNewImages((prev) => [...prev, ...selectedFiles]);

      const previews = selectedFiles.map((file) => URL.createObjectURL(file));
      setNewImagePreviews((prev) => [...prev, ...previews]);
    }
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((imgUrl) => imgUrl !== url));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Add a new empty variant
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { name: "", sku: slug ? `${slug}-${prev.length + 1}` : "", price: "0.00", stock: "0", imageUrl: "", imageFile: null, imagePreview: "" }
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

    // Append remaining existing images
    formData.delete("existingImages")
    existingImages.forEach((url) => {
      formData.append("existingImages", url)
    })

    // Append new images
    formData.delete("images")
    newImages.forEach((file) => {
      formData.append("images", file)
    })

    // Append variants array as JSON string
    formData.append("variants", JSON.stringify(variants.map(v => ({
      id: v.id, // Will be undefined for new variants
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price),
      stock: parseInt(v.stock),
      imageUrl: v.imageUrl || null, // retains existing if no new upload
    }))))

    // Append variant image files
    variants.forEach((v, index) => {
      if (v.imageFile) {
        formData.append(`variantImage_${index}`, v.imageFile)
      }
    })

    try {
      const res = await fetch(`/api/admin/products/${initialData.id}`, {
        method: "PUT",
        body: formData,
      })

      if (res.ok) {
        router.push("/admin/products")
        router.refresh()
      } else {
        const errData = await res.json()
        alert(errData.error || "Failed to update product")
      }
    } catch (e) {
      console.error(e)
      alert("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
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
        <div className="flex justify-between items-center">
          <Label htmlFor="slug" className="text-xs uppercase tracking-widest">Slug</Label>
          {isSlugManuallyEdited && (
            <button 
              type="button" 
              onClick={() => setIsSlugManuallyEdited(false)} 
              className="text-[10px] uppercase tracking-widest text-primary hover:underline"
            >
              Auto-generate from Name
            </button>
          )}
        </div>
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
              {/* Variant Image Picker */}
              <div className="col-span-2 grid gap-1.5">
                <Label className="text-[10px] uppercase tracking-widest">Image</Label>
                <div className="relative border border-border rounded h-10 w-full overflow-hidden bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer">
                  {v.imagePreview ? (
                    <img src={v.imagePreview} className="w-full h-full object-cover" alt="New Preview" />
                  ) : v.imageUrl ? (
                    <img src={v.imageUrl} className="w-full h-full object-cover" alt="Current" />
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
        
        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Active Images</h3>
            <div className="grid grid-cols-4 gap-4">
              {existingImages.map((url, index) => (
                <div key={index} className="relative group border border-border rounded-lg overflow-hidden aspect-square bg-muted">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            Drag & drop new images here or <span className="text-primary font-medium hover:underline">browse</span>
          </p>
        </div>

        {/* New Image Previews */}
        {newImagePreviews.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">New Images to Upload</h3>
            <div className="grid grid-cols-4 gap-4">
              {newImagePreviews.map((preview, index) => (
                <div key={index} className="relative group border border-border rounded-lg overflow-hidden aspect-square bg-muted">
                  <img
                    src={preview}
                    alt={`New Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="mt-4 h-12 uppercase tracking-widest text-xs">
        {loading ? "Saving Changes..." : "Save Product"}
      </Button>
    </form>
  )
}
