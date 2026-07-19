import { requireUser } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Calendario, type EventoTarea, type EventoRenovacion, type EventoCumple } from "./calendario"

export const dynamic = "force-dynamic"

export default async function AgendaPage() {
  const { supabase } = await requireUser()

  const [{ data: tareasData }, { data: polizasData }, { data: clientesData }] =
    await Promise.all([
      // Las tareas de cumpleaños se omiten aquí: los cumpleaños se pintan a
      // partir de la fecha de nacimiento del cliente (evento recurrente anual).
      supabase
        .from("tareas")
        .select(
          "id, tipo, titulo, descripcion, fecha_vencimiento, hora, estado, cliente:clientes(id, nombre, apellidos)"
        )
        .neq("tipo", "cumpleanos"),
      supabase
        .from("polizas")
        .select(
          "id, compania, numero_poliza, tipo, fecha_vencimiento, estado, cliente:clientes(id, nombre, apellidos)"
        )
        .in("estado", ["vigente", "en_renovacion", "vencida"]),
      supabase
        .from("clientes")
        .select("id, nombre, apellidos, fecha_nacimiento, telefono")
        .eq("estado", "activo")
        .not("fecha_nacimiento", "is", null),
    ])

  const tareas = (tareasData ?? []) as unknown as EventoTarea[]
  const renovaciones = (polizasData ?? []) as unknown as EventoRenovacion[]
  const cumples = (clientesData ?? []) as unknown as EventoCumple[]

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Tareas, renovaciones y cumpleaños en un vistazo"
      />
      <Calendario tareas={tareas} renovaciones={renovaciones} cumples={cumples} />
    </>
  )
}
