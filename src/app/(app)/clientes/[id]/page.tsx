import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Phone, Mail, MapPin, Cake } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { EstadoClienteBadge } from "@/components/badges"
import { EliminarClienteButton } from "./eliminar-cliente-button"
import { ClienteTabs } from "./cliente-tabs"
import { formatFecha } from "@/lib/format"
import type {
  ClienteRow,
  PolizaRow,
  InteraccionConPoliza,
  TareaConRelaciones,
  DocumentoRow,
} from "@/lib/database.types"
import type { ClienteFormInput } from "@/lib/schemas/cliente"

export const dynamic = "force-dynamic"

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireUser()

  const { data: clienteData } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!clienteData) notFound()
  const c = clienteData as ClienteRow

  const [{ data: polizasData }, { data: interData }, { data: tareasData }, { data: docsData }] =
    await Promise.all([
      supabase
        .from("polizas")
        .select("*")
        .eq("cliente_id", id)
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("interacciones")
        .select("*, poliza:polizas(id, compania, numero_poliza, tipo)")
        .eq("cliente_id", id)
        .order("fecha", { ascending: false }),
      supabase
        .from("tareas")
        .select("*, poliza:polizas(id, compania, tipo, numero_poliza)")
        .eq("cliente_id", id)
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("documentos")
        .select("*")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
    ])

  const polizas = (polizasData ?? []) as PolizaRow[]
  const interacciones = (interData ?? []) as unknown as InteraccionConPoliza[]
  const tareas = (tareasData ?? []) as unknown as TareaConRelaciones[]
  const documentos = (docsData ?? []) as DocumentoRow[]

  const formDefaults: Partial<ClienteFormInput> = {
    nombre: c.nombre,
    apellidos: c.apellidos,
    dni_nie: c.dni_nie ?? "",
    fecha_nacimiento: c.fecha_nacimiento ?? "",
    profesion: c.profesion ?? "",
    estado_civil: c.estado_civil ?? "",
    telefono: c.telefono ?? "",
    telefono_2: c.telefono_2 ?? "",
    email: c.email ?? "",
    direccion: c.direccion ?? "",
    codigo_postal: c.codigo_postal ?? "",
    poblacion: c.poblacion ?? "",
    provincia: c.provincia ?? "",
    notas: c.notas ?? "",
    estado: c.estado,
    origen: c.origen ?? "",
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2"
          render={<Link href="/clientes" />}
        >
          <ArrowLeft className="size-4" />
          Clientes
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {c.nombre} {c.apellidos}
            </h1>
            <EstadoClienteBadge estado={c.estado} />
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {c.telefono && (
              <a
                href={`tel:${c.telefono}`}
                className="hover:text-foreground flex items-center gap-1.5"
              >
                <Phone className="size-3.5" />
                {c.telefono}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="hover:text-foreground flex items-center gap-1.5"
              >
                <Mail className="size-3.5" />
                {c.email}
              </a>
            )}
            {c.poblacion && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {c.poblacion}
                {c.provincia && c.provincia !== c.poblacion ? ` (${c.provincia})` : ""}
              </span>
            )}
            {c.fecha_nacimiento && (
              <span className="flex items-center gap-1.5">
                <Cake className="size-3.5" />
                {formatFecha(c.fecha_nacimiento)}
              </span>
            )}
          </div>
        </div>

        <EliminarClienteButton id={c.id} nombre={`${c.nombre} ${c.apellidos}`} />
      </div>

      <ClienteTabs
        clienteId={c.id}
        formDefaults={formDefaults}
        polizas={polizas}
        interacciones={interacciones}
        tareas={tareas}
        documentos={documentos}
      />
    </div>
  )
}
