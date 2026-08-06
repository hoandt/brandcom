"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { MarkdownEditor } from "@/components/admin/markdown-editor"
import { Boxes, X, Image as ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  inventories: { warehouseId: string; quantity: number }[]
  imageFile?: File | null
  imagePreview?: string
}

interface Attribute {
  name: string
  options: string[]
}

// Cartesian product helper
const getCombinations = (arrays: string[][]): string[][] => {
  return arrays.reduce<string[][]>(
    (acc, val) => acc.flatMap(d => val.map(e => [...d, e])),
    [[]]
  );
};

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
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string; isDefault: boolean; isPickup: boolean }[]>([])
  const [inventoryVariantIndex, setInventoryVariantIndex] = useState<number | null>(null)

  // Attribute matrix states
  const [attributes, setAttributes] = useState<Attribute[]>([
    { name: "Color", options: [""] }
  ])

  const [variants, setVariants] = useState<VariantInput[]>([
    { name: "Default", sku: "", price: "0.00", stock: "0", inventories: [], imageFile: null, imagePreview: "" }
  ])

  // Bulk editor states
  const [bulkPrice, setBulkPrice] = useState("")
  const [bulkSku, setBulkSku] = useState("")

  useEffect(() => {
    fetch("/api/admin/warehouses")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Failed to load warehouses")))
      .then((data) => setWarehouses(data.warehouses || []))
      .catch((error) => console.error(error));
  }, []);

  // Cartesian combinations effect
  useEffect(() => {
    // Filter active attributes
    const activeAttrs = attributes.filter(a => a.name.trim() !== "" && a.options.some(o => o.trim() !== ""));

    if (activeAttrs.length === 0) {
      setVariants([
        { name: "Default", sku: slug ? `${slug}-default` : "", price: "0.00", stock: "0", inventories: [], imageFile: null, imagePreview: "" }
      ]);
      return;
    }

    const optionsArrays = activeAttrs.map(a => a.options.filter(o => o.trim() !== ""));
    const combinations = getCombinations(optionsArrays);
    const combinationNames = combinations.map(c => c.join(" / "));

    setVariants(prev => {
      return combinationNames.map(name => {
        const existing = prev.find(v => v.name === name);
        if (existing) return existing;

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

  // Auto-slugify name
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(clientSlugify(name));
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
      const inventories = [...variant.inventories.filter((inventory) => inventory.warehouseId !== warehouseId), { warehouseId, quantity: Math.max(0, quantity) }];
      return { ...variant, inventories, stock: inventories.reduce((sum, inventory) => sum + inventory.quantity, 0).toString() };
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
    e.preventDefault();
    setLoading(true);

    if (variants.some(v => !v.name || !v.sku || !v.price)) {
      alert("Please fill in all variant details in the matrix table.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("slug", slug);
    formData.set("description", description);
    formData.set("overview", overview);
    formData.set("materials", materials);
    formData.set("care", care);

    // Append variants array as JSON string
    formData.append("variants", JSON.stringify(variants.map(v => ({
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price),
      stock: parseInt(v.stock),
      inventories: v.inventories,
    }))));

    // Append main product images
    formData.delete("images");
    images.forEach((file) => {
      formData.append("images", file);
    });

    // Append specific variant image files
    variants.forEach((v, index) => {
      if (v.imageFile) {
        formData.append(`variantImage_${index}`, v.imageFile);
      }
    });

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create product");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] px-6 md:px-10 py-8 mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Product</h1>
        <p className="text-muted-foreground text-sm">Add a new item with dynamic variant matrices and localized assets</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 bg-card p-8 rounded-xl border border-border shadow-sm w-full">
        {/* Core Product Information */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest border-b pb-2">Product Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-widest font-medium">Product Name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Áo Thun Cotton Premium"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug" className="text-xs uppercase tracking-widest font-medium">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                placeholder="e.g. ao-thun-cotton-premium"
                className="h-11"
                value={slug}
                onChange={(e) => {
                  setIsSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest border-b pb-2">Product Story</h2>

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
            placeholder="- 100% fine cotton yarn&#10;- Relaxed silhouette&#10;- Soft and breathable fabric"
            value={overview}
            onChange={setOverview}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="space-y-6 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Variant Attributes</h2>
            {attributes.length < 2 && (
              <Button type="button" onClick={addAttribute} variant="outline" size="sm">
                + Add Attribute
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {attributes.map((attr, attrIdx) => (
              <div key={attrIdx} className="p-5 border border-border rounded-xl bg-secondary/15 relative">
                <button
                  type="button"
                  onClick={() => removeAttribute(attrIdx)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="grid gap-4">
                  <div className="max-w-xs">
                    <Label className="text-xs uppercase tracking-widest font-bold">Attribute {attrIdx + 1} Name</Label>
                    <Input
                      value={attr.name}
                      onChange={(e) => updateAttributeName(attrIdx, e.target.value)}
                      placeholder="e.g. Color or Size"
                      className="mt-1 h-10 bg-background"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-widest font-bold">Option Values</Label>
                    <div className="flex flex-wrap gap-2.5 mt-2 items-center">
                      {attr.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1 bg-background border rounded-full pl-3 pr-1 h-9 shadow-sm">
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
                            className="w-6 h-6 hover:bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive"
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
                        className="h-9 px-4 rounded-full border border-dashed"
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
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest">Variant Table Matrix</h2>

          {/* Bulk Action Controls */}
          <div className="bg-secondary/15 p-4 rounded-none border border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-4">
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

          <div className="border border-border rounded-none overflow-hidden shadow-sm">
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
                    <td className="px-4 py-3">
                      <div className="relative border border-border rounded-lg h-10 w-10 overflow-hidden bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer shadow-inner">
                        {v.imagePreview ? (
                          <img src={v.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
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
                        <td key={aIdx} className="px-4 py-3 font-semibold text-foreground">
                          {value}
                        </td>
                      );
                    })}
                    {!attributes.some(a => a.name.trim() !== "") && (
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {v.name}
                      </td>
                    )}

                    {/* Price */}
                    <td className="px-4 py-3">
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                        placeholder="29.00"
                        className="h-9"
                      />
                    </td>

                    {/* Multi-warehouse inventory */}
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setInventoryVariantIndex(index)} className="flex h-9 w-full items-center justify-between border border-input bg-background px-3 text-left text-xs hover:border-primary hover:text-primary">
                        <span className="flex items-center gap-2"><Boxes className="h-3.5 w-3.5" /> Total stock</span>
                        <strong>{v.inventories.reduce((sum, inventory) => sum + inventory.quantity, 0)}</strong>
                      </button>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      <Input
                        required
                        value={v.sku}
                        onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                        placeholder="e.g. SKU-123"
                        className="h-9"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Images Upload */}
        <div className="grid gap-2 pt-4 border-t border-border">
          <Label className="text-xs uppercase tracking-widest font-semibold">Main Product Images Gallery</Label>
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
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mt-4">
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

      <Dialog open={inventoryVariantIndex !== null} onOpenChange={(isOpen) => !isOpen && setInventoryVariantIndex(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-2xl [&_[data-slot=dialog-close]]:rounded-none">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Warehouse inventory</DialogTitle>
            <DialogDescription>{inventoryVariantIndex !== null ? `${variants[inventoryVariantIndex]?.name} · ${variants[inventoryVariantIndex]?.sku}` : "Allocate stock by warehouse"}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {warehouses.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Create an active warehouse before allocating inventory.</div> : inventoryVariantIndex !== null && warehouses.map((warehouse) => {
              const quantity = variants[inventoryVariantIndex]?.inventories.find((inventory) => inventory.warehouseId === warehouse.id)?.quantity ?? 0;
              return <div key={warehouse.id} className="grid grid-cols-[1fr_120px] items-center gap-4 border-b px-5 py-4 last:border-b-0">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{warehouse.name}</span>{warehouse.isDefault && <span className="bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Default</span>}</div><p className="mt-1 text-xs text-muted-foreground">{warehouse.code}{warehouse.isPickup ? " · Pickup" : ""}</p></div>
                <Input type="number" min="0" step="1" value={quantity} onChange={(event) => setWarehouseQuantity(inventoryVariantIndex, warehouse.id, Number.parseInt(event.target.value || "0", 10))} className="h-9 rounded-none text-right text-sm" aria-label={`Stock at ${warehouse.name}`} />
              </div>;
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
