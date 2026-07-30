import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  subtotal: z.number().min(0),
  shippingFee: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  couponCodes: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        sku: z.string(),
        productName: z.string(),
        variantName: z.string().optional(),
        price: z.number().min(0),
        quantity: z.number().min(1),
      })
    )
    .min(1, "At least one item is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the incoming request body
    const validatedData = checkoutSchema.parse(body);

    // Generate a unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let finalDiscount = 0;
    let finalShippingFee = validatedData.shippingFee;
    let finalTotalAmount = validatedData.subtotal + finalShippingFee;
    let validCouponIds: string[] = [];

    // Validate coupons if provided
    if (validatedData.couponCodes && validatedData.couponCodes.length > 0) {
      const MAX_COUPONS_PER_ORDER = 3;
      if (validatedData.couponCodes.length > MAX_COUPONS_PER_ORDER) {
         return NextResponse.json({ success: false, message: `Maximum ${MAX_COUPONS_PER_ORDER} coupons allowed` }, { status: 400 });
      }

      for (const code of validatedData.couponCodes) {
        const coupon = await prisma.coupon.findUnique({
          where: { code: code.toUpperCase() },
        });

        if (coupon && coupon.isActive && (!coupon.validFrom || new Date() >= coupon.validFrom) && (!coupon.validTo || new Date() <= coupon.validTo) && (coupon.maxUsage === null || coupon.usedCount < coupon.maxUsage) && (coupon.minOrderValue === null || validatedData.subtotal >= Number(coupon.minOrderValue))) {
          validCouponIds.push(coupon.id);
          const valueNum = Number(coupon.value);
          
          if (coupon.type === "PERCENTAGE") {
            const disc = validatedData.subtotal * (valueNum / 100);
            finalDiscount += disc;
          } else if (coupon.type === "FIXED") {
            finalDiscount += valueNum;
          } else if (coupon.type === "FREE_SHIPPING") {
            finalShippingFee = 0;
          }
        } else {
          return NextResponse.json({ success: false, message: `Invalid or expired coupon: ${code}` }, { status: 400 });
        }
      }
      
      // Ensure discount doesn't exceed subtotal
      if (finalDiscount > validatedData.subtotal) {
        finalDiscount = validatedData.subtotal;
      }
      
      finalTotalAmount = validatedData.subtotal + finalShippingFee - finalDiscount;
      if (finalTotalAmount < 0) finalTotalAmount = 0;
    }

    // Create the order and items in a single transaction
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail,
        address: validatedData.address,
        subtotal: validatedData.subtotal,
        shippingFee: finalShippingFee,
        discount: finalDiscount,
        totalAmount: finalTotalAmount,
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: "PENDING", // Initial status
        orderStatus: "PROCESSING", // Initial status
        coupons: validCouponIds.length > 0 ? {
          connect: validCouponIds.map(id => ({ id }))
        } : undefined,
        items: {
          create: validatedData.items.map((item) => ({
            variantId: item.variantId,
            sku: item.sku,
            productName: item.productName,
            variantName: item.variantName,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    });

    if (validCouponIds.length > 0) {
      await prisma.coupon.updateMany({
        where: { id: { in: validCouponIds } },
        data: { usedCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (error) {
    console.error("Checkout Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
