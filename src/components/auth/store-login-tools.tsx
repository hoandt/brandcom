"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { ZaloLoginDialog } from "@/components/auth/zalo-login-dialog"
import { Button } from "@/components/ui/button"

export { PhonePasswordLoginForm } from "@/components/auth/phone-password-login-form"

export function ZaloLoginButton({
  redirectTo,
}: {
  redirectTo?: string
}) {
  const t = useTranslations("Login")
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full rounded-none text-xs uppercase tracking-wider"
        onClick={() => setOpen(true)}
      >
        {t("continueWithZalo")}
      </Button>
      <ZaloLoginDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          router.push(redirectTo || `/${locale}/account`)
          router.refresh()
        }}
      />
    </>
  )
}
