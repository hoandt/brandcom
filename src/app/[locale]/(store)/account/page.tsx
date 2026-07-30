import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export default async function AccountPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-24">
      <div className="mb-8">
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-2">My Account</h1>
        <p className="text-muted-foreground font-light text-sm">Welcome back, {session.user.name || "Customer"}</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Profile Information</h2>
          <div className="text-lg font-medium">{session.user.name}</div>
          <div className="text-muted-foreground">{session.user.email}</div>
        </div>

        <div className="pt-4 border-t border-border">
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <Button type="submit" variant="outline" className="uppercase tracking-widest text-xs">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
