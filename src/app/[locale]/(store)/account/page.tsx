import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"

export default async function AccountPage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  redirect(`/${locale}/account/orders`)
}
