import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { name, slug, price } = await req.json()

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        status: "ACTIVE",
        variants: {
          create: {
            name: "Default Variant",
            sku: `${slug}-default-${Date.now()}`,
            price: price,
            stock: 10,
          }
        }
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
