import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Convención `proxy` de Next.js 16 (antes `middleware`). Refresca la sesión de
// Supabase y protege todas las rutas salvo las excluidas en el matcher.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Protege todo excepto:
     * - _next/static, _next/image (assets)
     * - favicon y archivos estáticos comunes
     * - la ruta de cron (protegida por CRON_SECRET aparte)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
