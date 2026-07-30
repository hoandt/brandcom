import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-2">Create Account</h1>
        <p className="text-muted-foreground font-light text-sm">Join Auria today</p>
      </div>

      <div className="space-y-6">
        {/* Social Registration */}
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
            <span className="bg-background px-2 text-muted-foreground">Or register with email</span>
          </div>
        </div>

        {/* Credentials Registration */}
        <form className="space-y-4" action="/api/auth/register" method="POST">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-widest">Full Name</Label>
            <Input id="name" name="name" type="text" placeholder="John Doe" required className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
            <Input id="password" name="password" type="password" required className="h-12" />
          </div>
          
          <Button type="submit" className="w-full h-12 mt-2 uppercase tracking-widest text-xs">
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8 uppercase tracking-widest">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
