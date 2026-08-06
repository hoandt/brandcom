import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { OrdersClient } from "./orders-client"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  const locale = await getLocale()
  const { status } = await searchParams

  if (!session?.user?.id) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations("Account")

  const currentStatus = status || "all"

  const translations = {
    totalAmount: t("totalAmount"),
    products: t("products"),
    writeReview: t("writeReview"),
    viewCancelDetails: t("viewCancelDetails"),
    viewDetails: t("viewDetails"),
    buyAgain: t("buyAgain"),
    statusCompleted: t("statusCompleted"),
    statusCancelled: t("statusCancelled"),
    ordersAll: t("ordersAll"),
    ordersToPay: t("ordersToPay"),
    ordersToShip: t("ordersToShip"),
    ordersCompleted: t("ordersCompleted"),
    ordersCancelled: t("ordersCancelled"),
    sidebarOrderStatuses: t("orderStatusTabs"),
  }

  return (
    <OrdersClient
      locale={locale}
      initialStatus={currentStatus}
      translations={translations}
    />
  )
}
