import { Card, CardContent } from "@/components/ui/card"
import { CuentaClient } from "@/app/cuenta/cuenta-client"

export const dynamic = "force-dynamic"

// Se llega aquí tras pulsar el enlace del email (con sesión de recuperación ya
// activa). Reutiliza el formulario de cambio de contraseña.
export default function ActualizarPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Establece tu nueva contraseña para acceder.
      </p>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <CuentaClient />
        </CardContent>
      </Card>
    </div>
  )
}
