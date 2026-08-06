"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { signInWithPhonePassword } from "@/app/actions/zalo-auth"
import { isValidVietnamesePhone } from "@/lib/auth/phone-otp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

class PhoneLoginError extends Error {
  constructor(public readonly code: "INVALID_CREDENTIALS" | "AUTH_UNAVAILABLE") {
    super(code)
    this.name = "PhoneLoginError"
  }
}

export function PhonePasswordLoginForm({
  redirectTo,
  onSuccess,
}: {
  redirectTo?: string
  onSuccess?: () => void | Promise<void>
}) {
  const t = useTranslations("Login")
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const loginMutation = useMutation({
    mutationFn: async () => {
      const result = await signInWithPhonePassword(phone, password)
      if (!result.success) throw new PhoneLoginError(result.code)
    },
    onSuccess: async () => {
      if (onSuccess) {
        await onSuccess()
        return
      }

      if (redirectTo) {
        router.push(redirectTo)
        router.refresh()
      }
    },
  })

  const errorMessage =
    loginMutation.error instanceof PhoneLoginError &&
    loginMutation.error.code === "INVALID_CREDENTIALS"
      ? t("invalidCredentials")
      : loginMutation.error
        ? t("authUnavailable")
        : null

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        loginMutation.mutate()
      }}
    >
      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest">
          {t("phoneLabel")}
        </span>
        <Input
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            loginMutation.reset()
          }}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("phonePlaceholder")}
          className="h-12 rounded-none"
          aria-invalid={Boolean(errorMessage)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest">
          {t("password")}
        </span>
        <span className="relative block">
          <Input
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              loginMutation.reset()
            }}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 rounded-none pr-12"
            aria-invalid={Boolean(errorMessage)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </span>
      </label>

      {errorMessage && (
        <p className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="h-12 w-full rounded-none text-xs uppercase tracking-widest"
        disabled={
          loginMutation.isPending ||
          !isValidVietnamesePhone(phone) ||
          password.length === 0
        }
      >
        {loginMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {loginMutation.isPending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  )
}
