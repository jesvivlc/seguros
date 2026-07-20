"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Loader2, UserCog, Eye } from "lucide-react"
import {
  ROL_LABEL,
  ROL_OPTIONS,
  VISIBILIDAD_OPTIONS,
  type Visibilidad,
  type RolUsuario,
} from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SelectSimple } from "@/components/ui/select-field"
import { crearAgente, cambiarVisibilidad, cambiarEstadoUsuario } from "./actions"

export interface MiembroEquipo {
  userId: string
  email: string
  nombre: string | null
  rol: RolUsuario | null
  activo: boolean
  esYo: boolean
}

export function EquipoClient({
  visibilidad,
  miembros,
}: {
  visibilidad: Visibilidad
  miembros: MiembroEquipo[]
}) {
  const router = useRouter()
  const [vis, setVis] = React.useState<Visibilidad>(visibilidad)
  const [cambiandoVis, setCambiandoVis] = React.useState(false)

  const [email, setEmail] = React.useState("")
  const [nombre, setNombre] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [rol, setRol] = React.useState<RolUsuario>("agente")
  const [creando, setCreando] = React.useState(false)

  const [pendingUser, setPendingUser] = React.useState<string | null>(null)

  async function guardarVisibilidad(v: Visibilidad) {
    setVis(v)
    setCambiandoVis(true)
    const res = await cambiarVisibilidad(v)
    setCambiandoVis(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo cambiar")
      setVis(visibilidad)
      return
    }
    toast.success("Visibilidad actualizada")
    router.refresh()
  }

  async function crear() {
    if (!email.trim() || !password) {
      toast.error("Email y contraseña obligatorios")
      return
    }
    setCreando(true)
    const res = await crearAgente({ email, password, nombre, rol })
    setCreando(false)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo crear")
      return
    }
    setEmail("")
    setNombre("")
    setPassword("")
    setRol("agente")
    toast.success("Usuario creado")
    router.refresh()
  }

  async function toggleUsuario(m: MiembroEquipo) {
    setPendingUser(m.userId)
    const res = await cambiarEstadoUsuario(m.userId, !m.activo)
    setPendingUser(null)
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo actualizar")
      return
    }
    toast.success(m.activo ? "Usuario desactivado" : "Usuario activado")
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      {/* Visibilidad */}
      <Card>
        <CardContent className="grid gap-2 pt-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="size-4" /> Visibilidad de la cartera
          </div>
          <p className="text-muted-foreground text-sm">
            Decide si todos los usuarios ven toda la cartera o si cada agente ve solo
            los clientes de los que es propietario (el admin siempre lo ve todo).
          </p>
          <div className="mt-1 flex items-center gap-2 sm:max-w-md">
            <SelectSimple
              value={vis}
              onValueChange={(v) => guardarVisibilidad(v as Visibilidad)}
              options={VISIBILIDAD_OPTIONS}
            />
            {cambiandoVis && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>

      {/* Alta de usuario */}
      <Card>
        <CardContent className="grid gap-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserCog className="size-4" /> Añadir usuario
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@correduria.com"
            />
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (opcional)"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña temporal (mín. 8)"
            />
            <SelectSimple
              value={rol}
              onValueChange={(v) => setRol(v as RolUsuario)}
              options={ROL_OPTIONS}
            />
          </div>
          <div>
            <Button onClick={crear} disabled={creando}>
              {creando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Crear usuario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">
          Usuarios <span className="text-muted-foreground">({miembros.length})</span>
        </h3>
        {miembros.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{m.nombre || m.email}</span>
                {m.rol && <Badge variant="outline">{ROL_LABEL[m.rol]}</Badge>}
                {m.esYo && <span className="text-muted-foreground text-xs">(tú)</span>}
                {!m.activo && <Badge variant="outline">inactivo</Badge>}
              </div>
              {m.nombre && (
                <p className="text-muted-foreground text-xs">{m.email}</p>
              )}
            </div>
            {!m.esYo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleUsuario(m)}
                disabled={pendingUser === m.userId}
              >
                {pendingUser === m.userId && <Loader2 className="size-4 animate-spin" />}
                {m.activo ? "Desactivar" : "Activar"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
