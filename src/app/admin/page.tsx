import { requireSuperAdmin } from "@/lib/auth"
import { formatFecha } from "@/lib/format"
import { VISIBILIDAD_LABEL } from "@/lib/constants"
import type { CorreduriaRow } from "@/lib/database.types"
import { CrearCorreduriaForm } from "./crear-correduria-form"
import { CorreduriaFila } from "./correduria-fila"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { supabase } = await requireSuperAdmin()
  const { data } = await supabase
    .from("corredurias")
    .select("*")
    .order("created_at", { ascending: false })
  const corredurias = (data ?? []) as CorreduriaRow[]

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-sm font-medium">Nueva correduría</h2>
        <CrearCorreduriaForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">
          Corredurías{" "}
          <span className="text-muted-foreground">({corredurias.length})</span>
        </h2>
        {corredurias.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Todavía no hay corredurías. Crea la primera arriba.
          </p>
        ) : (
          <div className="grid gap-2">
            {corredurias.map((c) => (
              <CorreduriaFila
                key={c.id}
                id={c.id}
                nombre={c.nombre}
                activa={c.activa}
                visibilidad={VISIBILIDAD_LABEL[c.visibilidad]}
                alta={formatFecha(c.created_at)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
