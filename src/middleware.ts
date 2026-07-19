import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
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
