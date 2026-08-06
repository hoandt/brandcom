import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { ProfileClient } from "./profile-client"

export default async function ProfilePage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations("Account")

  return (
    <ProfileClient
      sessionName={session.user.name}
      locale={locale}
      title={t("profileInfo")}
    />
  )
}
