import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { OrderDetailsClient } from "./order-details-client"

export default async function OrderDetailsPage({
  params
}: {
  params: Promise<{ locale: string, id: string }>
}) {
  const { locale, id } = await params;
  const session = await auth()

  if (!session?.user?.email) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations("Account")

  const translations = {
    orderDetails: t.has("orderDetails") ? t("orderDetails") : "Chi tiết đơn hàng",
    shippingAddress: t.has("shippingAddress") ? t("shippingAddress") : "Địa chỉ nhận hàng",
    paymentMethod: t.has("paymentMethod") ? t("paymentMethod") : "Phương thức thanh toán",
    subtotal: t.has("subtotal") ? t("subtotal") : "Tổng tiền hàng",
    shippingFee: t.has("shippingFee") ? t("shippingFee") : "Phí vận chuyển",
    discount: t.has("discount") ? t("discount") : "Giảm giá",
    totalAmount: t.has("totalAmount") ? t("totalAmount") : "Thành tiền",
    writeReview: t.has("writeReview") ? t("writeReview") : "Đánh giá",
    statusCompleted: t.has("statusCompleted") ? t("statusCompleted") : "Hoàn thành",
    statusCancelled: t.has("statusCancelled") ? t("statusCancelled") : "Đã huỷ",
    statusPending: t.has("statusPending") ? t("statusPending") : "Chờ thanh toán",
    statusProcessing: t.has("statusProcessing") ? t("statusProcessing") : "Đang xử lý",
    cancelOrder: t.has("cancelOrder") ? t("cancelOrder") : (locale === "vi" ? "Huỷ đơn hàng" : "Cancel Order"),
    confirmCancelOrder: t.has("confirmCancelOrder") ? t("confirmCancelOrder") : (locale === "vi" ? "Bạn có chắc chắn muốn huỷ đơn hàng này không?" : "Are you sure you want to cancel this order?"),
  }

  return (
    <OrderDetailsClient id={id} locale={locale} translations={translations} />
  )
}
