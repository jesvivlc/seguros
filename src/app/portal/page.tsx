import { requirePortal } from "@/lib/auth"
import { formatFecha, formatEuros } from "@/lib/format"
import { esRenovacionProxima } from "@/lib/semaforo"
import {
  TIPO_POLIZA_LABEL,
  TIPO_SINIESTRO_LABEL,
  type TipoPoliza,
  type EstadoPoliza,
  type TipoSiniestro,
  type EstadoSiniestro,
} from "@/lib/constants"
import { EstadoPolizaBadge, SemaforoBadge, EstadoSiniestroBadge } from "@/components/badges"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DocumentosPortal, type DocPortal } from "./documentos-portal"

export const dynamic = "force-dynamic"

type PolizaPortal = {
  id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  fecha_vencimiento: string
  prima_anual: number | null
  estado: EstadoPoliza
}
type SiniestroPortal = {
  id: string
  numero_siniestro: string | null
  tipo: TipoSiniestro
  estado: EstadoSiniestro
  fecha_apertura: string
  descripcion: string | null
}

export default async function PortalPage() {
  const { supabase, acceso } = await requirePortal()

  const [{ data: cli }, { data: polData }, { data: sinData }, { data: docData }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("nombre, correduria_id")
        .eq("id", acceso.cliente_id)
        .maybeSingle(),
      supabase
        .from("polizas")
        .select("id, compania, numero_poliza, tipo, fecha_vencimiento, prima_anual, estado")
        .eq("cliente_id", acceso.cliente_id)
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("siniestros")
        .select("id, numero_siniestro, tipo, estado, fecha_apertura, descripcion")
        .eq("cliente_id", acceso.cliente_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("documentos")
        .select("id, nombre, categoria, storage_path, tamano_bytes, created_at")
        .eq("cliente_id", acceso.cliente_id)
        .order("created_at", { ascending: false }),
    ])

  const polizas = (polData ?? []) as PolizaPortal[]
  const siniestros = (sinData ?? []) as SiniestroPortal[]
  const documentos = (docData ?? []) as DocPortal[]
  const correduriaId = (cli?.correduria_id as string) ?? ""

  const proximas = polizas.filter(
    (p) =>
      (p.estado === "vigente" || p.estado === "en_renovacion") &&
      esRenovacionProxima(p.fecha_vencimiento)
  )

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola{cli?.nombre ? `, ${cli.nombre}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Consulta tus pólizas y siniestros, y comparte documentación con tu correduría.
        </p>
      </div>

      {proximas.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Próximas renovaciones</h2>
          <div className="grid gap-2">
            {proximas.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.compania} · {TIPO_POLIZA_LABEL[p.tipo]}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Vence el {formatFecha(p.fecha_vencimiento)}
                    </p>
                  </div>
                  <SemaforoBadge fechaVencimiento={p.fecha_vencimiento} estado={p.estado} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Mis pólizas{" "}
          <span className="text-muted-foreground text-sm font-normal">({polizas.length})</span>
        </h2>
        {polizas.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tienes pólizas registradas todavía.</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Póliza</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Prima</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Renovación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {polizas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.compania}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {p.numero_poliza}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {TIPO_POLIZA_LABEL[p.tipo]}
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">
                      {formatFecha(p.fecha_vencimiento)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums">
                      {formatEuros(p.prima_anual)}
                    </TableCell>
                    <TableCell>
                      <EstadoPolizaBadge estado={p.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <SemaforoBadge fechaVencimiento={p.fecha_vencimiento} estado={p.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {siniestros.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Mis siniestros{" "}
            <span className="text-muted-foreground text-sm font-normal">({siniestros.length})</span>
          </h2>
          <div className="grid gap-2">
            {siniestros.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{TIPO_SINIESTRO_LABEL[s.tipo]}</span>
                  {s.numero_siniestro && (
                    <span className="text-muted-foreground font-mono text-xs">
                      {s.numero_siniestro}
                    </span>
                  )}
                  <EstadoSiniestroBadge estado={s.estado} />
                  <span className="text-muted-foreground text-xs">
                    Abierto el {formatFecha(s.fecha_apertura)}
                  </span>
                </div>
                {s.descripcion && (
                  <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                    {s.descripcion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Mis documentos{" "}
          <span className="text-muted-foreground text-sm font-normal">({documentos.length})</span>
        </h2>
        <DocumentosPortal
          clienteId={acceso.cliente_id}
          correduriaId={correduriaId}
          documentos={documentos}
        />
      </section>

      <p className="text-muted-foreground text-xs">
        ¿Algún dato incorrecto o alguna duda? Contacta con tu correduría.
      </p>
    </div>
  )
}
