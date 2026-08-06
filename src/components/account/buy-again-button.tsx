"use client"

import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useCartStore } from "@/stores/cart-store"
import { useRouter } from "next/navigation"

interface BuyAgainItem {
  variantId: string;
  productName: string;
  variantName?: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
  productSlug?: string;
}

interface BuyAgainButtonProps {
  items: BuyAgainItem[];
  locale: string;
}

export function BuyAgainButton({ items, locale }: BuyAgainButtonProps) {
  const t = useTranslations("Account")
  const addItem = useCartStore((state) => state.addItem)
  const router = useRouter()

  const handleBuyAgain = () => {
    items.forEach((item) => {
      addItem({
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        productSlug: item.productSlug
      })
    })

    router.push(`/${locale}/checkout`)
  }

  return (
    <Button
      variant="outline"
      className="h-8 px-4 text-xs font-medium border-primary text-primary hover:bg-primary/5 rounded-none"
      onClick={handleBuyAgain}
    >
      {t("buyAgain")}
    </Button>
  )
}
