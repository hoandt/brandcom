import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="container mx-auto max-w-md px-4 py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-2">Welcome Back</h1>
        <p className="text-muted-foreground font-light text-sm">Sign in to your account</p>
      </div>

      {searchParams.error === "CredentialsSignin" && (
        <div className="bg-destructive/15 text-destructive text-xs p-3 rounded-md mb-6 text-center border border-destructive/20 uppercase tracking-widest">
          Invalid email or password
        </div>
      )}

      <div className="space-y-6">
        {/* Social Logins */}
        <div className="flex flex-col gap-3">
          <form
            action={async () => {
              "use server"
              await signIn("google")
            }}
          >
            <Button type="submit" variant="outline" className="w-full h-12 uppercase tracking-wider text-xs">
              Continue with Google
            </Button>
          </form>

          <form
            action={async () => {
              "use server"
              await signIn("apple")
            }}
          >
            <Button type="submit" variant="outline" className="w-full h-12 uppercase tracking-wider text-xs">
              Continue with Apple
            </Button>
          </form>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Credentials Login */}
        <form
          className="space-y-4"
          action={async (formData) => {
            "use server"
            try {
              await signIn("credentials", formData, { redirectTo: "/" })
            } catch (err) {
              if (err instanceof AuthError) {
                switch (err.type) {
                  case 'CredentialsSignin':
                    redirect("?error=CredentialsSignin");
                  default:
                    redirect("?error=Default");
                }
              }
              throw err;
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-12" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
              <Link href="#" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary">
                Forgot?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required className="h-12" />
          </div>
          
          <Button type="submit" className="w-full h-12 mt-2 uppercase tracking-widest text-xs">
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8 uppercase tracking-widest">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline underline-offset-4">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
