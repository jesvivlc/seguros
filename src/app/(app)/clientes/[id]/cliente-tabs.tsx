"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, FileText, MessageSquarePlus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SemaforoBadge, EstadoPolizaBadge } from "@/components/badges"
import { ClienteForm } from "../cliente-form"
import { InteraccionesTab } from "./interacciones-tab"
import { TareasTab } from "./tareas-tab"
import { DocumentosTab } from "./documentos-tab"
import { SiniestrosTab } from "./siniestros-tab"
import { PortalTab, type AccesoPortal } from "./portal-tab"
import { TIPO_POLIZA_LABEL } from "@/lib/constants"
import { formatEuros, formatFecha } from "@/lib/format"
import type { ClienteFormInput } from "@/lib/schemas/cliente"
import type {
  PolizaRow,
  InteraccionConPoliza,
  TareaConRelaciones,
  DocumentoRow,
  SiniestroConRelaciones,
} from "@/lib/database.types"

type PolizaLite = Pick<
  PolizaRow,
  | "id"
  | "compania"
  | "numero_poliza"
  | "tipo"
  | "fecha_vencimiento"
  | "prima_anual"
  | "estado"
>

export function ClienteTabs({
  clienteId,
  correduriaId,
  formDefaults,
  polizas,
  interacciones,
  tareas,
  documentos,
  siniestros,
  portalAcceso,
  clienteEmail,
}: {
  clienteId: string
  correduriaId: string
  formDefaults: Partial<ClienteFormInput>
  polizas: PolizaLite[]
  interacciones: InteraccionConPoliza[]
  tareas: TareaConRelaciones[]
  documentos: DocumentoRow[]
  siniestros: SiniestroConRelaciones[]
  portalAcceso: AccesoPortal | null
  clienteEmail?: string
}) {
  const vigentes = polizas.filter((p) => p.estado === "vigente").length
  const [tab, setTab] = React.useState("datos")

  function irANuevaInteraccion() {
    setTab("timeline")
    // Espera al render del panel antes de enfocar el formulario.
    setTimeout(() => {
      const el = document.getElementById("nueva-interaccion")
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      el?.querySelector("input")?.focus()
    }, 80)
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      {/* Botón flotante "+ Interacción" siempre visible en la ficha */}
      <Button
        onClick={irANuevaInteraccion}
        className="fixed right-5 bottom-5 z-40 shadow-lg"
      >
        <MessageSquarePlus className="size-4" />
        <span className="hidden sm:inline">Interacción</span>
      </Button>

      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="datos">Datos</TabsTrigger>
        <TabsTrigger value="polizas">
          Pólizas
          {polizas.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {polizas.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="documentos">
          Documentos
          {documentos.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {documentos.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="siniestros">
          Siniestros
          {siniestros.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {siniestros.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="tareas">Tareas</TabsTrigger>
        <TabsTrigger value="portal">Portal</TabsTrigger>
      </TabsList>

      {/* DATOS */}
      <TabsContent value="datos" className="mt-4">
        <ClienteForm clienteId={clienteId} defaultValues={formDefaults} />
      </TabsContent>

      {/* PÓLIZAS */}
      <TabsContent value="polizas" className="mt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums">{vigentes}</span>
            <span className="text-muted-foreground text-sm">
              {vigentes === 1 ? "póliza vigente" : "pólizas vigentes"}
            </span>
          </div>
          <Button
            size="sm"
            render={<Link href={`/polizas/nueva?cliente=${clienteId}`} />}
          >
            <Plus className="size-4" />
            Nueva póliza
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Póliza</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  Prima
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Renovación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polizas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <FileText className="size-7 opacity-40" />
                      Este cliente no tiene pólizas todavía.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                polizas.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/polizas/${p.id}`} className="block">
                        <div className="font-medium">{p.compania}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {p.numero_poliza}
                        </div>
                      </Link>
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
                      <SemaforoBadge
                        fechaVencimiento={p.fecha_vencimiento}
                        estado={p.estado}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* TIMELINE */}
      <TabsContent value="timeline" className="mt-4">
        <InteraccionesTab
          clienteId={clienteId}
          polizas={polizas.map((p) => ({
            id: p.id,
            compania: p.compania,
            tipo: p.tipo,
            numero_poliza: p.numero_poliza,
          }))}
          interacciones={interacciones}
        />
      </TabsContent>

      {/* DOCUMENTOS */}
      <TabsContent value="documentos" className="mt-4">
        <DocumentosTab
          clienteId={clienteId}
          correduriaId={correduriaId}
          documentos={documentos}
        />
      </TabsContent>

      {/* SINIESTROS */}
      <TabsContent value="siniestros" className="mt-4">
        <SiniestrosTab
          clienteId={clienteId}
          polizas={polizas.map((p) => ({
            id: p.id,
            compania: p.compania,
            numero_poliza: p.numero_poliza,
            tipo: p.tipo,
          }))}
          siniestros={siniestros}
        />
      </TabsContent>

      {/* TAREAS */}
      <TabsContent value="tareas" className="mt-4">
        <TareasTab clienteId={clienteId} tareas={tareas} />
      </TabsContent>

      {/* PORTAL */}
      <TabsContent value="portal" className="mt-4">
        <PortalTab
          clienteId={clienteId}
          acceso={portalAcceso}
          defaultEmail={clienteEmail}
        />
      </TabsContent>
    </Tabs>
  )
}
