import { redirect } from "next/navigation"
import Link from "next/link"
import { Umbrella } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Topbar } from "@/components/layout/topbar"
import { CommandMenu } from "@/components/layout/command-menu"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh">
      {/* Sidebar fija (desktop) */}
      <aside className="bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <Umbrella className="size-4" />
            </span>
            CRM Seguros
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
        <div className="text-muted-foreground border-t px-5 py-3 text-xs">
          Correduría · Fase 1
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email ?? "usuario"} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>

      {/* Paleta de comandos global */}
      <CommandMenu />
    </div>
  )
}
