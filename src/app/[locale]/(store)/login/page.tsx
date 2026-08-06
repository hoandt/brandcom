import { signIn } from "@/auth"
import {
  PhonePasswordLoginForm,
  ZaloLoginButton,
} from "@/components/auth/store-login-tools"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"

function safeRedirectTo(value: string | undefined, locale: string) {
  const fallback = `/${locale}/account`

  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback
  }

  return value
}

export default async function LoginPage(props: {
  searchParams: Promise<{ redirectTo?: string }>
  params: Promise<{ locale: string }>
}) {
  const searchParams = await props.searchParams
  const { locale } = await props.params
  const t = await getTranslations({ locale, namespace: "Login" })
  const redirectTo = safeRedirectTo(searchParams.redirectTo, locale)
  const isVietnameseMarket = locale === "vi"
  const hasGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  )
  const hasApple = Boolean(
    process.env.NEXT_PUBLIC_APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  )
  const hasSocialProvider = hasGoogle || hasApple

  return (
    <div className="container mx-auto max-w-md px-4 py-24">
      <div className="mb-8 text-center">
        <h1 className="mb-2 font-heading text-3xl uppercase tracking-widest">
          {t("title")}
        </h1>
        <p className="text-sm font-light text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {isVietnameseMarket ? (
          <>
            <PhonePasswordLoginForm redirectTo={redirectTo} />
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>
            <ZaloLoginButton redirectTo={redirectTo} />
          </>
        ) : (
          <>
            {hasGoogle && (
              <form
                action={async () => {
                  "use server"
                  await signIn("google", { redirectTo })
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  className="h-12 w-full text-xs uppercase tracking-wider"
                >
                  {t("continueWithGoogle")}
                </Button>
              </form>
            )}

            {hasApple && (
              <form
                action={async () => {
                  "use server"
                  await signIn("apple", { redirectTo })
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  className="h-12 w-full text-xs uppercase tracking-wider"
                >
                  {t("continueWithApple")}
                </Button>
              </form>
            )}

            {!hasSocialProvider && (
              <p className="border border-border p-3 text-center text-xs text-muted-foreground">
                {t("socialUnavailable")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
