"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Save, Plus, Trash2 } from "lucide-react"

import {
  polizaSchema,
  type PolizaFormInput,
  type PolizaFormValues,
} from "@/lib/schemas/poliza"
import {
  TIPO_POLIZA_OPTIONS,
  FORMA_PAGO_OPTIONS,
  ESTADO_POLIZA_OPTIONS,
} from "@/lib/constants"
import { crearPoliza, actualizarPoliza } from "./actions"
import type { ClienteOpcion } from "@/components/cliente-combobox"
import { ClienteCombobox } from "@/components/cliente-combobox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SelectSimple } from "@/components/ui/select-field"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const VACIO: PolizaFormInput = {
  cliente_id: "",
  compania: "",
  numero_poliza: "",
  tipo: "auto",
  matricula: "",
  riesgo_asegurado: "",
  fecha_efecto: "",
  fecha_vencimiento: "",
  prima_anual: "",
  forma_pago: "anual",
  coberturas: [],
  carencias: "",
  observaciones: "",
  estado: "vigente",
}

export function PolizaForm({
  polizaId,
  clientes,
  defaultValues,
}: {
  polizaId?: string
  clientes: ClienteOpcion[]
  defaultValues?: Partial<PolizaFormInput>
}) {
  const router = useRouter()
  const esEdicion = Boolean(polizaId)

  const form = useForm<PolizaFormInput, unknown, PolizaFormValues>({
    resolver: zodResolver(polizaSchema),
    defaultValues: { ...VACIO, ...defaultValues },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coberturas",
  })

  async function onSubmit(values: PolizaFormValues) {
    const res = esEdicion
      ? await actualizarPoliza(polizaId!, values)
      : await crearPoliza(values)

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [campo, mensaje] of Object.entries(res.fieldErrors)) {
          form.setError(campo as keyof PolizaFormInput, { message: mensaje })
        }
      }
      toast.error(res.error ?? "No se pudo guardar")
      return
    }

    toast.success(esEdicion ? "Póliza actualizada" : "Póliza creada")
    router.push(`/polizas/${res.id ?? polizaId}`)
    router.refresh()
  }

  const { isSubmitting } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de la póliza</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field, fieldState }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <ClienteCombobox
                      value={field.value}
                      onValueChange={field.onChange}
                      options={clientes}
                      ariaInvalid={!!fieldState.error}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compania"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compañía *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mapfre, Allianz…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numero_poliza"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de póliza *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MAP-AUTO-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <FormControl>
                    <SelectSimple
                      value={field.value}
                      onValueChange={field.onChange}
                      options={TIPO_POLIZA_OPTIONS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="matricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matrícula</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="1234 KLM (solo auto)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="riesgo_asegurado"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Riesgo asegurado</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Vehículo, dirección, persona…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vigencia y pago</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fecha_efecto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de efecto *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fecha_vencimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de vencimiento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prima_anual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prima anual (€)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="decimal"
                      placeholder="480.50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="forma_pago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pago</FormLabel>
                  <FormControl>
                    <SelectSimple
                      value={field.value}
                      onValueChange={field.onChange}
                      options={FORMA_PAGO_OPTIONS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <SelectSimple
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ESTADO_POLIZA_OPTIONS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Coberturas</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ nombre: "", capital: "", franquicia: "" })}
            >
              <Plus className="size-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {fields.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Sin coberturas. Añade las garantías de la póliza.
              </p>
            )}
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <FormField
                  control={form.control}
                  name={`coberturas.${i}.nombre`}
                  render={({ field }) => (
                    <FormItem>
                      {i === 0 && <FormLabel className="sm:hidden">Nombre</FormLabel>}
                      <FormControl>
                        <Input {...field} placeholder="Responsabilidad Civil" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`coberturas.${i}.capital`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Capital" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`coberturas.${i}.franquicia`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="Franquicia" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  aria-label="Quitar cobertura"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Otros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="carencias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carencias</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {esEdicion ? "Guardar cambios" : "Crear póliza"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
