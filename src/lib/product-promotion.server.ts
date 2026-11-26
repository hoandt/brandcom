import { prisma } from "@/lib/prisma";
import {
  defaultProductPromotion,
  PRODUCT_PROMOTION_CODE,
  resolveProductPromotion,
  validateProductPromotion,
} from "@/lib/product-promotion";

export async function getProductPromotion(slug: string) {
  try {
    const component = await prisma.dynamicComponent.findUnique({
      where: { code: PRODUCT_PROMOTION_CODE },
      select: { content: true, isActive: true },
    });

    if (!component) return resolveProductPromotion(defaultProductPromotion, slug);
    if (!component.isActive) return null;

    const { content } = validateProductPromotion(component.content);
    if (!content) return null;

    return resolveProductPromotion(content, slug);
  } catch (error) {
    console.error("[GET_PRODUCT_PROMOTION_ERROR]", error);
    return null;
  }
}
