"use client"

import { useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateAccount } from "./actions"
import { useTranslations } from "next-intl"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { formatVietnamesePhone } from "@/lib/auth/phone-otp"

interface AccountFormProps {
  user: {
    name?: string | null
    phone?: string | null
    email?: string | null
    password?: string | null
  }
  sessionName?: string | null
  locale: string
}

function PasswordInput({ name, label }: { name: string, label: string }) {
  const [show, setShow] = useState(false)
  const loginT = useTranslations("Login")

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</label>
      <div className="relative max-w-md">
        <Input
          type={show ? "text" : "password"}
          name={name}
          placeholder="••••••••"
          className="h-12 rounded-none pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((visible) => !visible)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={show ? loginT("hidePassword") : loginT("showPassword")}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

export function AccountForm({ user, sessionName, locale }: AccountFormProps) {
  const t = useTranslations("Account")
  const [state, formAction, isPending] = useActionState(updateAccount, undefined)

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Account updated successfully")
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form className="space-y-8" action={formAction}>
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("name")}</label>
          <Input name="name" defaultValue={user?.name || sessionName || ""} className="h-12" />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("phone")}</label>
          <Input
            value={user?.phone ? formatVietnamesePhone(user.phone) : ""}
            readOnly
            aria-readonly="true"
            className="h-12 bg-muted/50 text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">{t("phoneLocked")}</p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("email")}</label>
          <Input name="email" defaultValue={user?.email || ""} disabled className="h-12 bg-muted/50 opacity-70" />
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground">{t("changePassword")}</h3>
        <div className="space-y-6">
          {user.password && (
            <div className="border-b border-border/50 pb-6">
              <PasswordInput name="currentPassword" label={t("currentPassword")} />
            </div>
          )}
          <PasswordInput name="newPassword" label={t("newPassword")} />
          <PasswordInput name="confirmNewPassword" label={t("confirmNewPassword")} />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-6">
        <Button type="submit" disabled={isPending} className="h-12 rounded-none uppercase tracking-widest font-bold px-8 shadow-sm">
          {isPending ? "..." : t("saveChanges")}
        </Button>
      </div>
    </form>
  )
}
