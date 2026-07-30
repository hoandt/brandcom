"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const slug = formData.get("slug") as string
    const price = formData.get("price") as string

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({ name, slug, price: parseFloat(price) }),
        headers: { "Content-Type": "application/json" }
      })

      if (res.ok) {
        router.push("/admin/products")
        router.refresh()
      } else {
        alert("Failed to create product")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
      <form onSubmit={onSubmit} className="grid gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="grid gap-2">
          <Label htmlFor="name">Product Name</Label>
          <Input id="name" name="name" required placeholder="e.g. Minimalist Watch" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required placeholder="e.g. minimalist-watch" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input id="price" name="price" type="number" step="0.01" required placeholder="99.00" />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Saving..." : "Create Product"}
        </Button>
      </form>
    </div>
  )
}
