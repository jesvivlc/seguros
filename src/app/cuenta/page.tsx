import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { CuentaClient } from "./cuenta-client"

export const dynamic = "force-dynamic"

export default async function CuentaPage() {
  const { user } = await requireUser()
  return (
    <div className="mx-auto max-w-md p-4 md:p-8">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
      <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <CuentaClient />
        </CardContent>
      </Card>
    </div>
  )
}
