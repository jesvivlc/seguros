import { Umbrella } from "lucide-react"
import { LoginForm } from "./login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams
  const redirectTo = redirect && redirect.startsWith("/") ? redirect : "/"

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
            <Umbrella className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">CRM Seguros</h1>
            <p className="text-muted-foreground text-sm">
              Accede a tu cartera de clientes y pólizas
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Acceso restringido. Contacta con el administrador si no puedes entrar.
        </p>
      </div>
    </main>
  )
}
