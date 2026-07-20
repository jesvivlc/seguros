import Link from "next/link"
import { Umbrella } from "lucide-react"
import { requireCorreduria } from "@/lib/auth"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Topbar } from "@/components/layout/topbar"
import { CommandMenu } from "@/components/layout/command-menu"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Exige perfil de correduría; los super-admin sin correduría van a /admin.
  const { supabase, user, perfil } = await requireCorreduria()
  const esAdmin = perfil.rol === "admin"

  const { data: corr } = await supabase
    .from("corredurias")
    .select("nombre")
    .eq("id", perfil.correduria_id!)
    .maybeSingle()
  const correduriaNombre = corr?.nombre ?? "CRM Seguros"

  return (
    <div className="flex min-h-svh">
      {/* Sidebar fija (desktop) */}
      <aside className="bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
              <Umbrella className="size-4" />
            </span>
            <span className="truncate">{correduriaNombre}</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav esAdmin={esAdmin} />
        </div>
        <div className="text-muted-foreground border-t px-5 py-3 text-xs">
          {esAdmin ? "Administrador" : "Agente"}
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={user.email ?? "usuario"}
          esAdmin={esAdmin}
          correduriaNombre={correduriaNombre}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>

      {/* Paleta de comandos global */}
      <CommandMenu />
    </div>
  )
}
