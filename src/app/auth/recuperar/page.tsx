import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { RecuperarClient } from "./recuperar-client"

export default function RecuperarPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Te enviaremos un enlace para establecer una nueva contraseña.
      </p>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <RecuperarClient />
        </CardContent>
      </Card>
      <Link href="/login" className="text-muted-foreground mt-4 text-center text-sm hover:underline">
        Volver a iniciar sesión
      </Link>
    </div>
  )
}
