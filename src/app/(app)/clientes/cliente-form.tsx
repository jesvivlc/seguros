"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

import {
  clienteSchema,
  type ClienteFormInput,
  type ClienteFormValues,
} from "@/lib/schemas/cliente"
import {
  ESTADO_CLIENTE_OPTIONS,
  ESTADO_CIVIL_OPCIONES,
} from "@/lib/constants"
import { crearCliente, actualizarCliente } from "./actions"
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

const ESTADO_CIVIL_OPTIONS = ESTADO_CIVIL_OPCIONES.map((v) => ({
  value: v,
  label: v,
}))

const VACIO: ClienteFormInput = {
  nombre: "",
  apellidos: "",
  dni_nie: "",
  fecha_nacimiento: "",
  profesion: "",
  estado_civil: "",
  telefono: "",
  telefono_2: "",
  email: "",
  direccion: "",
  codigo_postal: "",
  poblacion: "",
  provincia: "",
  notas: "",
  estado: "activo",
  origen: "",
}

export function ClienteForm({
  clienteId,
  defaultValues,
}: {
  clienteId?: string
  defaultValues?: Partial<ClienteFormInput>
}) {
  const router = useRouter()
  const esEdicion = Boolean(clienteId)

  const form = useForm<ClienteFormInput, unknown, ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { ...VACIO, ...defaultValues },
  })

  async function onSubmit(values: ClienteFormValues) {
    const res = esEdicion
      ? await actualizarCliente(clienteId!, values)
      : await crearCliente(values)

    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [campo, mensaje] of Object.entries(res.fieldErrors)) {
          form.setError(campo as keyof ClienteFormInput, { message: mensaje })
        }
      }
      toast.error(res.error ?? "No se pudo guardar")
      return
    }

    toast.success(esEdicion ? "Cliente actualizado" : "Cliente creado")
    router.push(`/clientes/${res.id ?? clienteId}`)
    router.refresh()
  }

  const { isSubmitting } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="María" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="García López" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dni_nie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI / NIE</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345678Z" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fecha_nacimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profesion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profesión</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Profesora" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="estado_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado civil</FormLabel>
                  <FormControl>
                    <SelectSimple
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ESTADO_CIVIL_OPTIONS}
                      placeholder="Selecciona…"
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
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="tel" placeholder="612345678" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono 2</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="tel" placeholder="Opcional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="cliente@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dirección</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Calle Mayor 12, 3ºB" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo_postal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código postal</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="28013" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poblacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Población</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Madrid" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="provincia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Madrid" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clasificación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                      options={ESTADO_CLIENTE_OPTIONS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="origen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Recomendación, Web…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Observaciones internas sobre el cliente…"
                    />
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
            {esEdicion ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
