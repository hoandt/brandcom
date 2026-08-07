"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { MarkdownEditor } from "@/components/admin/markdown-editor"
import { Boxes, X, Image as ImageIcon, Star } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CategoryPicker } from "@/components/admin/category-picker"
import { useLocale } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"

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
  inventories: { warehouseId: string; quantity: number }[]
  imageUrl?: string
  imageFile?: File | null
  imagePreview?: string
}

interface Attribute {
  name: string
  options: string[]
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
    categoryIds: string[]
    images: string[]
    variants: {
      id: string
      name: string
      sku: string
      price: number
      stock: number
      inventories: { warehouseId: string; quantity: number }[]
      imageUrl: string
    }[]
    warehouses: { id: string; name: string; code: string; isDefault: boolean; isPickup: boolean }[]
  }
}

// Cartesian product helper
const getCombinations = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>(
    (acc, val) => acc.flatMap(d => val.map(e => [...d, e])),
    [[]]
  );
};

// Parser to reconstruct attributes/options from database flat variants
const parseInitialAttributes = (variantsList: { name: string }[]): Attribute[] => {
  if (variantsList.length === 0) {
    return [{ name: "Color", options: [""] }];
  }

  if (variantsList.length === 1 && variantsList[0].name === "Default") {
    return [{ name: "Color", options: [""] }];
  }

  const splitNames = variantsList.map(v => v.name.split(" / "));
  const numAttributes = Math.max(...splitNames.map(parts => parts.length));

  if (numAttributes === 1) {
    const options = Array.from(new Set(variantsList.map(v => v.name)));
    const isSize = options.some(o => ["s", "m", "l", "xl", "s/m", "l/xl"].includes(o.toLowerCase()));
    return [{
      name: isSize ? "Size" : "Color",
      options
    }];
  }

  const attributes: Attribute[] = [];
  for (let idx = 0; idx < numAttributes; idx++) {
    const options = Array.from(new Set(splitNames.map(parts => parts[idx] || "").filter(o => o !== "")));
    attributes.push({
      name: idx === 0 ? "Color" : "Size",
      options
    });
  }

  return attributes;
};

export default function EditProductForm({ initialData }: EditProductFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const locale = useLocale()
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(initialData.name)
  const [slug, setSlug] = useState(initialData.slug)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(true)
  const [description, setDescription] = useState(initialData.description)
  const [overview, setOverview] = useState(initialData.overview)
  const [materials, setMaterials] = useState(initialData.materials)
  const [care, setCare] = useState(initialData.care)
  const [categoryIds, setCategoryIds] = useState<string[]>(initialData.categoryIds)

  const [existingImages, setExistingImages] = useState<string[]>(initialData.images)
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [mainImageKey, setMainImageKey] = useState<string | null>(
    initialData.images[0] ? `existing:${initialData.images[0]}` : null
  )

  // Reconstruct attributes state from database
  const [attributes, setAttributes] = useState<Attribute[]>(
    parseInitialAttributes(initialData.variants)
  )

  const [variants, setVariants] = useState<VariantInput[]>(
    initialData.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price.toFixed(2),
      stock: v.stock.toString(),
      inventories: v.inventories.length > 0
        ? v.inventories
        : initialData.warehouses[0] && v.stock > 0
          ? [{ warehouseId: initialData.warehouses[0].id, quantity: v.stock }]
          : [],
      imageUrl: v.imageUrl,
      imageFile: null,
      imagePreview: ""
    }))
  )

  // Bulk editor states
  const [bulkPrice, setBulkPrice] = useState("")
  const [bulkSku, setBulkSku] = useState("")
  const [inventoryVariantIndex, setInventoryVariantIndex] = useState<number | null>(null)

  // Cartesian combinations effect
  useEffect(() => {
    const activeAttrs = attributes.filter(a => a.name.trim() !== "" && a.options.some(o => o.trim() !== ""));

    if (activeAttrs.length === 0) {
      const existingDefault = variants.find(v => v.name === "Default" || v.name === "Default Variant") || variants[0];
      setVariants([
        {
          id: existingDefault?.id,
          name: "Default",
          sku: existingDefault?.sku || (slug ? `${slug}-default` : ""),
          price: existingDefault?.price || "0.00",
          stock: existingDefault?.stock || "10",
          inventories: existingDefault?.inventories || [],
          imageUrl: existingDefault?.imageUrl,
          imageFile: existingDefault?.imageFile || null,
          imagePreview: existingDefault?.imagePreview || ""
        }
      ]);
      return;
    }

    const optionsArrays = activeAttrs.map(a => a.options.filter(o => o.trim() !== ""));
    const combinations = getCombinations(optionsArrays);
    const combinationNames = combinations.map(c => c.join(" / "));

    setVariants(prev => {
      return combinationNames.map(name => {
        const existingState = prev.find(v => v.name === name);
        if (existingState) return existingState;

        const initialMatch = initialData.variants.find(v => v.name === name);
        if (initialMatch) {
          return {
            id: initialMatch.id,
            name: initialMatch.name,
            sku: initialMatch.sku,
            price: initialMatch.price.toFixed(2),
            stock: initialMatch.stock.toString(),
            inventories: initialMatch.inventories,
            imageUrl: initialMatch.imageUrl,
            imageFile: null,
            imagePreview: ""
          };
        }

        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const variantSku = slug ? `${slug}-${cleanName}` : "";

        return {
          name,
          sku: variantSku,
          price: "0.00",
          stock: "0",
          inventories: [],
          imageFile: null,
          imagePreview: ""
        };
      });
    });
  }, [attributes, slug]);

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
      if (!mainImageKey && previews[0]) setMainImageKey(`new:${previews[0]}`);
    }
  };

  const removeExistingImage = (url: string) => {
    const remainingExistingImages = existingImages.filter((imgUrl) => imgUrl !== url);
    setExistingImages(remainingExistingImages);
    if (mainImageKey === `existing:${url}`) {
      setMainImageKey(
        remainingExistingImages[0]
          ? `existing:${remainingExistingImages[0]}`
          : newImagePreviews[0]
            ? `new:${newImagePreviews[0]}`
            : null
      );
    }
  };

  const removeNewImage = (index: number) => {
    const removedPreview = newImagePreviews[index];
    const remainingPreviews = newImagePreviews.filter((_, i) => i !== index);
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    if (mainImageKey === `new:${removedPreview}`) {
      setMainImageKey(
        existingImages[0]
          ? `existing:${existingImages[0]}`
          : remainingPreviews[0]
            ? `new:${remainingPreviews[0]}`
            : null
      );
    }
  };

  // Manage Attribute Fields
  const addAttribute = () => {
    if (attributes.length >= 2) {
      alert("Maximum of 2 attributes (e.g. Color and Size) are supported.");
      return;
    }
    setAttributes(prev => [...prev, { name: "", options: [""] }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const updateAttributeName = (index: number, val: string) => {
    const updated = [...attributes];
    updated[index].name = val;
    setAttributes(updated);
  };

  const addAttributeOption = (attrIdx: number) => {
    const updated = [...attributes];
    updated[attrIdx].options.push("");
    setAttributes(updated);
  };

  const updateAttributeOption = (attrIdx: number, optIdx: number, val: string) => {
    const updated = [...attributes];
    updated[attrIdx].options[optIdx] = val;
    setAttributes(updated);
  };

  const removeAttributeOption = (attrIdx: number, optIdx: number) => {
    const updated = [...attributes];
    updated[attrIdx].options = updated[attrIdx].options.filter((_, i) => i !== optIdx);
    if (updated[attrIdx].options.length === 0) {
      updated[attrIdx].options.push("");
    }
    setAttributes(updated);
  };

  // Handle variant input changes
  const handleVariantChange = (index: number, field: keyof VariantInput, value: string | File | null) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handle variant image picker
  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      handleVariantChange(index, "imageFile", file);
      handleVariantChange(index, "imagePreview", preview);
    }
  };

  const setWarehouseQuantity = (variantIndex: number, warehouseId: string, quantity: number) => {
    setVariants((current) => current.map((variant, index) => {
      if (index !== variantIndex) return variant;
      const inventories = [
        ...variant.inventories.filter((inventory) => inventory.warehouseId !== warehouseId),
        { warehouseId, quantity: Math.max(0, quantity) },
      ];
      const stock = inventories.reduce((sum, inventory) => sum + inventory.quantity, 0).toString();
      return { ...variant, inventories, stock };
    }));
  };

  // Bulk actions apply
  const handleApplyBulk = () => {
    setVariants(prev => prev.map(v => {
      const cleanName = v.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const isDefault = v.name === "Default" || v.name === "Default Variant";
      const finalSku = bulkSku ? (isDefault ? bulkSku : `${bulkSku}-${cleanName}`) : v.sku;
      return {
        ...v,
        price: bulkPrice ? parseFloat(bulkPrice).toFixed(2) : v.price,
        sku: finalSku
      };
    }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    if (variants.some(v => !v.name || !v.sku || !v.price)) {
      alert("Please fill in all variant details in the matrix table.")
      setLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set("slug", slug)
    formData.set("description", description)
    formData.set("overview", overview)
    formData.set("materials", materials)
    formData.set("care", care)
    formData.set("categoryIds", JSON.stringify(categoryIds))

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

    if (mainImageKey?.startsWith("existing:")) {
      formData.set("mainImageType", "existing")
      formData.set("mainImageValue", mainImageKey.slice("existing:".length))
    } else if (mainImageKey?.startsWith("new:")) {
      const selectedPreview = mainImageKey.slice("new:".length)
      const selectedNewImageIndex = newImagePreviews.indexOf(selectedPreview)
      if (selectedNewImageIndex >= 0) {
        formData.set("mainImageType", "new")
        formData.set("mainImageValue", selectedNewImageIndex.toString())
      }
    }

    // Append variants array as JSON string
    formData.append("variants", JSON.stringify(variants.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price),
      stock: parseInt(v.stock),
      inventories: v.inventories,
      imageUrl: v.imageUrl || null,
    }))))

    // Append new variant image files
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
        queryClient.removeQueries({ queryKey: ["admin-product", initialData.id] })
        await queryClient.invalidateQueries({ queryKey: ["admin-products"] })
        router.push(`/${locale}/admin/products`)
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
    <div className="w-full">
      <form onSubmit={onSubmit} className="grid gap-6 bg-card p-4 border border-border shadow-none w-full">
        {/* Name */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b pb-2">Product Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs uppercase tracking-widest font-bold">Product Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Áo Thun Cotton Premium"
                className="h-9 rounded-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="slug" className="text-xs uppercase tracking-widest font-bold">Slug</Label>
                {isSlugManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => setIsSlugManuallyEdited(false)}
                    className="text-[10px] uppercase tracking-widest text-primary hover:underline"
                  >
                    Auto-generate
                  </button>
                )}
              </div>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="e.g. ao-thun-cotton-premium"
                className="h-9 rounded-none"
                value={slug}
                onChange={(e) => {
                  setIsSlugManuallyEdited(true)
                  setSlug(e.target.value)
                }}
              />
            </div>
          </div>
        </div>

        <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} />

        {/* Product Story */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest border-b pb-2">Product Story</h2>

          <MarkdownEditor
            id="description"
            name="description"
            label="Description"
            placeholder="Main product introduction..."
            value={description}
            onChange={setDescription}
            rows={3}
          />

          <MarkdownEditor
            id="overview"
            name="overview"
            label="Product Overview (Highlights)"
            placeholder="- 100% fine cotton yarn&#10;- Relaxed raglan silhouette&#10;- Soft and breathable fabric"
            value={overview}
            onChange={setOverview}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MarkdownEditor
              id="materials"
              name="materials"
              label="Materials"
              placeholder="e.g. 100% Mulberry Silk, 22 Momme"
              value={materials}
              onChange={setMaterials}
              rows={2}
            />

            <MarkdownEditor
              id="care"
              name="care"
              label="Care Instructions"
              placeholder="e.g. Machine wash cold, line dry, iron low"
              value={care}
              onChange={setCare}
              rows={2}
            />
          </div>
        </div>

        {/* Variant Attributes Matrix Configuration */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest">Variant Attributes</h2>
            {attributes.length < 2 && (
              <Button type="button" onClick={addAttribute} variant="outline" size="sm" className="h-8 rounded-none text-xs">
                + Add Attribute
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {attributes.map((attr, attrIdx) => (
              <div key={attrIdx} className="p-3 border border-border rounded-none bg-secondary/15 relative">
                <button
                  type="button"
                  onClick={() => removeAttribute(attrIdx)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="grid gap-3">
                  <div className="max-w-xs">
                    <Label className="text-xs uppercase tracking-widest font-bold">Attribute {attrIdx + 1} Name</Label>
                    <Input
                      value={attr.name}
                      onChange={(e) => updateAttributeName(attrIdx, e.target.value)}
                      placeholder="e.g. Color or Size"
                      className="mt-1 h-9 bg-background rounded-none"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-widest font-bold">Option Values</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                      {attr.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1 bg-background border rounded-none pl-2.5 pr-1 h-8">
                          <input
                            value={opt}
                            onChange={(e) => updateAttributeOption(attrIdx, optIdx, e.target.value)}
                            placeholder="e.g. Blue"
                            className="bg-transparent text-xs border-none outline-none font-medium w-20"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => removeAttributeOption(attrIdx, optIdx)}
                            className="w-5 h-5 hover:bg-secondary rounded-none flex items-center justify-center text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        onClick={() => addAttributeOption(attrIdx)}
                        variant="secondary"
                        size="xs"
                        className="h-8 px-3 rounded-none border border-dashed text-xs"
                      >
                        + Add Value
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Variant Matrix Table */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">Variant Table Matrix</h2>

          {/* Bulk Action Controls */}
          <div className="bg-secondary/15 p-3 rounded-none border border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Bulk Price</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 120000"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="h-9 mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Bulk Base SKU</Label>
              <Input
                placeholder="e.g. SKU-BASE"
                value={bulkSku}
                onChange={(e) => setBulkSku(e.target.value)}
                className="h-9 mt-1 bg-background"
              />
            </div>
            <div className="flex">
              <Button
                type="button"
                onClick={handleApplyBulk}
                className="h-9 text-xs w-full uppercase tracking-wider font-bold"
              >
                Apply to All
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-none overflow-hidden shadow-none">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-muted/40 font-heading uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left w-16">Image</th>
                  {attributes.map((a, idx) => (
                    a.name && <th key={idx} className="px-4 py-3 text-left">{a.name}</th>
                  ))}
                  {!attributes.some(a => a.name) && <th className="px-4 py-3 text-left">Variant</th>}
                  <th className="px-4 py-3 text-left w-44">Price</th>
                  <th className="px-4 py-3 text-left w-44">Inventory</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {variants.map((v, index) => (
                  <tr key={index} className="hover:bg-secondary/10 transition-colors">
                    {/* Image swatch */}
                    <td className="px-3 py-2">
                      <div className="relative border border-border rounded-none h-9 w-9 overflow-hidden bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer">
                        {v.imagePreview ? (
                          <img src={v.imagePreview} className="w-full h-full object-cover" alt="New Preview" />
                        ) : v.imageUrl ? (
                          <img src={v.imageUrl} className="w-full h-full object-cover" alt="Current" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => handleVariantImageChange(index, e)}
                        />
                      </div>
                    </td>

                    {/* Attribute values columns */}
                    {attributes.filter(a => a.name.trim() !== "").map((a, aIdx) => {
                      const value = v.name.split(" / ")[aIdx] || "";
                      return (
                        <td key={aIdx} className="px-3 py-2 font-bold text-xs text-foreground">
                          {value}
                        </td>
                      );
                    })}
                    {!attributes.some(a => a.name.trim() !== "") && (
                      <td className="px-3 py-2 font-bold text-xs text-foreground">
                        {v.name}
                      </td>
                    )}

                    {/* Price */}
                    <td className="px-3 py-2">
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                        placeholder="29.00"
                        className="h-8 rounded-none text-xs"
                      />
                    </td>

                    {/* Multi-warehouse inventory */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setInventoryVariantIndex(index)}
                        className="flex h-9 w-full items-center justify-between border border-input bg-background px-3 text-left text-xs hover:border-primary hover:text-primary"
                      >
                        <span className="flex items-center gap-2"><Boxes className="h-3.5 w-3.5" /> Total stock</span>
                        <strong>{v.inventories.reduce((sum, inventory) => sum + inventory.quantity, 0)}</strong>
                      </button>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2">
                      <Input
                        required
                        value={v.sku}
                        onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                        placeholder="e.g. SKU-123"
                        className="h-8 rounded-none text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Main Images Gallery */}
        <div className="grid gap-2 pt-4 border-t border-border">
          <div>
            <Label className="text-xs uppercase tracking-widest font-bold">Product Images Gallery</Label>
            <p className="mt-1 text-[10px] text-muted-foreground">Choose one main image. It appears first in product listings and on the product page.</p>
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-3">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Active Images</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {existingImages.map((url, index) => {
                  const isMainImage = mainImageKey === `existing:${url}`;
                  return (
                  <div key={url} className={`relative group overflow-hidden border aspect-square bg-muted ${isMainImage ? "border-2 border-primary" : "border-border"}`}>
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded-none text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainImageKey(`existing:${url}`)}
                      className={`absolute bottom-1 left-1 flex h-7 items-center gap-1 border px-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${isMainImage ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/95 text-foreground sm:opacity-0 sm:group-hover:opacity-100"}`}
                      aria-label={isMainImage ? "Main product image" : `Set image ${index + 1} as main`}
                    >
                      <Star className="h-3 w-3" fill={isMainImage ? "currentColor" : "none"} />
                      {isMainImage ? "Main" : "Set main"}
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-border rounded-none p-4 text-center hover:bg-accent/30 transition-colors cursor-pointer relative">
            <input
              type="file"
              id="images"
              name="images"
              multiple
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleImageChange}
            />
            <p className="text-xs text-muted-foreground">
              Drag &amp; drop new images here or <span className="text-primary font-medium hover:underline">browse</span>
            </p>
          </div>

          {/* New Image Previews */}
          {newImagePreviews.length > 0 && (
            <div className="mt-3">
              <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">New Images to Upload</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {newImagePreviews.map((preview, index) => {
                  const isMainImage = mainImageKey === `new:${preview}`;
                  return (
                  <div key={preview} className={`relative group overflow-hidden border aspect-square bg-muted ${isMainImage ? "border-2 border-primary" : "border-border"}`}>
                    <img
                      src={preview}
                      alt={`New Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded-none text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainImageKey(`new:${preview}`)}
                      className={`absolute bottom-1 left-1 flex h-7 items-center gap-1 border px-2 text-[9px] font-bold uppercase tracking-wider transition-colors ${isMainImage ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/95 text-foreground sm:opacity-0 sm:group-hover:opacity-100"}`}
                      aria-label={isMainImage ? "Main product image" : `Set new image ${index + 1} as main`}
                    >
                      <Star className="h-3 w-3" fill={isMainImage ? "currentColor" : "none"} />
                      {isMainImage ? "Main" : "Set main"}
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="h-9 rounded-none uppercase tracking-widest text-xs font-bold">
          {loading ? "Saving Changes..." : "Save Product"}
        </Button>
      </form>

      <Dialog open={inventoryVariantIndex !== null} onOpenChange={(isOpen) => !isOpen && setInventoryVariantIndex(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-2xl [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Warehouse inventory</DialogTitle>
            <DialogDescription>
              {inventoryVariantIndex !== null ? `${variants[inventoryVariantIndex]?.name} · ${variants[inventoryVariantIndex]?.sku}` : "Allocate stock by warehouse"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {initialData.warehouses.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Create an active warehouse before allocating inventory.</div>
            ) : inventoryVariantIndex !== null && initialData.warehouses.map((warehouse) => {
              const quantity = variants[inventoryVariantIndex]?.inventories.find((inventory) => inventory.warehouseId === warehouse.id)?.quantity ?? 0;
              return (
                <div key={warehouse.id} className="grid grid-cols-[1fr_120px] items-center gap-4 border-b px-5 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{warehouse.name}</span>{warehouse.isDefault && <span className="bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Default</span>}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{warehouse.code}{warehouse.isPickup ? " · Pickup" : ""}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={quantity}
                    onChange={(event) => setWarehouseQuantity(inventoryVariantIndex, warehouse.id, Number.parseInt(event.target.value || "0", 10))}
                    className="h-9 rounded-none text-right text-sm"
                    aria-label={`Stock at ${warehouse.name}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t bg-background px-5 py-4">
            <div className="text-xs text-muted-foreground">Total inventory <strong className="ml-2 text-base text-foreground">{inventoryVariantIndex !== null ? variants[inventoryVariantIndex]?.inventories.reduce((sum, inventory) => sum + inventory.quantity, 0) ?? 0 : 0}</strong></div>
            <Button type="button" onClick={() => setInventoryVariantIndex(null)} className="h-9 rounded-none px-5 text-xs uppercase tracking-wider">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
