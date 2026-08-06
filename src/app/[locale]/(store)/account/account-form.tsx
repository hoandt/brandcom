"use client"

import { useActionState, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateAccount } from "./actions"
import { useTranslations } from "next-intl"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

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

function PasswordInput({ name, label, placeholder }: { name: string, label: string, placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          name={name}
          placeholder={placeholder || "••••••••"}
          className="h-12 pr-10 max-w-md"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground md:right-auto md:left-[26rem]"
          style={{ right: '12px' }}
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
          <Input name="phone" defaultValue={user?.phone || ""} className="h-12" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("email")}</label>
          <Input name="email" defaultValue={user?.email || ""} disabled className="h-12 bg-muted/50 opacity-70" />
        </div>
      </div>

      <div className="pt-8 border-t border-border">
         <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-foreground">{t("changePassword")}</h3>

         <div className="space-y-6">
           {/* If user has a password, require current password to change it */}
           {user.password && (
             <div className="pb-6 border-b border-border/50">
               <PasswordInput name="currentPassword" label={t("currentPassword")} />
             </div>
           )}

           <div className="space-y-6">
             <PasswordInput name="newPassword" label={t("newPassword")} />
             <PasswordInput name="confirmNewPassword" label={t("confirmNewPassword")} />
           </div>
         </div>
      </div>

      <div className="flex items-center gap-4 pt-6">
        <Button type="submit" disabled={isPending} className="h-12 rounded-full uppercase tracking-widest font-bold px-8 shadow-sm">
          {isPending ? "..." : t("saveChanges")}
        </Button>
      </div>
    </form>
  )
}
