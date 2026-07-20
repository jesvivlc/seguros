import { Building2 } from "lucide-react"
import { requireSuperAdmin } from "@/lib/auth"
import { logout } from "@/app/login/actions"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireSuperAdmin()

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Building2 className="size-4" />
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Panel de plataforma</h1>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
        </div>
        <form action={logout}>
          <button className="text-muted-foreground text-sm hover:underline">
            Cerrar sesión
          </button>
        </form>
      </header>
      {children}
    </div>
  )
}
