import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus } from "lucide-react"
import { ProductInventoryDialog } from "@/components/admin/product-inventory-dialog"

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      images: {
        orderBy: { position: "asc" },
        take: 1,
      },
      variants: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          inventories: {
            where: { quantity: { gt: 0 } },
            orderBy: { warehouse: { name: "asc" } },
            include: {
              warehouse: {
                select: { id: true, name: true, code: true, isDefault: true, isActive: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-xs text-muted-foreground">Manage your store product catalogue.</p>
        </div>
        <Button render={<Link href="/admin/products/new" />} className="h-9 rounded-none px-4 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </Button>
      </div>
      <div className="rounded-none border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-14 text-xs font-bold uppercase tracking-wider">Image</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Slug</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider">Inventory</TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-xs">
                  No products found.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/10">
                <TableCell className="py-2">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-none border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-none border border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground uppercase font-light">
                      None
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-bold text-xs py-2">
                  <Link href={`/admin/products/${product.id}/edit`} className="hover:underline hover:text-primary transition-colors">
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono py-2">{product.slug}</TableCell>
                <TableCell className="py-2">
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border ${
                    product.status === "ACTIVE"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : product.status === "DRAFT"
                      ? "bg-gray-100 text-gray-800 border-gray-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}>
                    {product.status}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <ProductInventoryDialog productName={product.name} variants={product.variants} />
                </TableCell>
                <TableCell className="text-right py-2">
                  <Button render={<Link href={`/admin/products/${product.id}/edit`} />} variant="ghost" size="sm" className="h-7 rounded-none text-xs px-3">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
