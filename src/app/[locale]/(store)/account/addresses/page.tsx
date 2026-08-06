import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getTranslations, getLocale } from "next-intl/server"
import { prisma } from "@/lib/prisma"
import { MapPin, Phone, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function AddressesPage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user?.email) {
    redirect(`/${locale}/login`)
  }

  const t = await getTranslations("Account")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { addresses: true }
  })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col min-h-[600px]">
      <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
        <h2 className="text-xl font-heading uppercase tracking-widest text-primary">{t("sidebarAddresses")}</h2>
        <Button className="rounded-full uppercase tracking-widest text-xs font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add New
        </Button>
      </div>

      <div className="p-6 flex-1 flex flex-col bg-muted/10">
        {user?.addresses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
            <MapPin className="w-16 h-16 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground uppercase tracking-widest text-sm">No addresses found.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {user?.addresses.map((address: any) => (
              <div key={address.id} className="border border-border rounded-lg p-5 flex flex-col relative bg-card shadow-sm">
                {address.isDefault && (
                  <span className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                    Default
                  </span>
                )}
                <div className="font-bold text-lg mb-2 text-foreground">{address.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <Phone className="w-3.5 h-3.5" /> {address.phone}
                </div>
                <div className="text-sm text-muted-foreground flex items-start gap-2 mb-4">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">
                    {address.address}<br/>
                    {address.wardName}, {address.districtName}<br/>
                    {address.provinceName}
                  </span>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex items-center gap-6">
                  <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    Edit
                  </button>
                  <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
