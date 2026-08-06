import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
  params: Promise<{ locale: string }>
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams.error === "CredentialsSignin" && (
            <div className="bg-destructive/15 text-destructive text-xs p-3 rounded-md mb-4 text-center border border-destructive/20 font-medium">
              Invalid email or password
            </div>
          )}
          <form
            action={async (formData) => {
              "use server"
              try {
                await signIn("admin-credentials", formData)
              } catch (err) {
                if (err instanceof AuthError) {
                  switch (err.type) {
                    case "CredentialsSignin":
                      redirect(`/${locale}/admin/login?error=CredentialsSignin`)
                    default:
                      redirect(`/${locale}/admin/login?error=Default`)
                  }
                }
                throw err
              }
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
