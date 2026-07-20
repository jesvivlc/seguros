import Link from "next/link"
import { Umbrella } from "lucide-react"
import { requirePortal } from "@/lib/auth"
import { logout } from "@/app/login/actions"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, acceso } = await requirePortal()
  const { data: cli } = await supabase
    .from("clientes")
    .select("nombre, apellidos")
    .eq("id", acceso.cliente_id)
    .maybeSingle()

  return (
    <div className="min-h-svh">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
        <div className="flex items-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Umbrella className="size-4" />
          </span>
          Portal del cliente
        </div>
        <div className="flex-1" />
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {cli ? `${cli.nombre} ${cli.apellidos}` : ""}
        </span>
        <Link href="/cuenta" className="text-muted-foreground text-sm hover:underline">
          Mi cuenta
        </Link>
        <form action={logout}>
          <button className="text-muted-foreground text-sm hover:underline">
            Salir
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl p-4 md:p-6">{children}</main>
    </div>
  )
}
