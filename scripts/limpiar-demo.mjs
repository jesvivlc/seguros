// Elimina TODOS los datos de demostración: corredurías "DEMO …" (cascada:
// clientes, pólizas, siniestros, tareas, perfiles, portal_accesos) y todos los
// usuarios auth cuyo email empiece por "demo." (agentes y logins de portal).
// Uso: node scripts/limpiar-demo.mjs
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    for (const l of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {}
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Faltan credenciales"); process.exit(1) }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// 1. Corredurías DEMO (cascada elimina su cartera y perfiles/portal ligados)
const { data: corr } = await sb.from("corredurias").select("id, nombre").ilike("nombre", "DEMO %")
for (const c of corr ?? []) {
  await sb.from("corredurias").delete().eq("id", c.id)
  console.log("Correduría eliminada:", c.nombre)
}

// 2. Usuarios auth de demo (agentes + portal)
const { data: list } = await sb.auth.admin.listUsers()
let borrados = 0
for (const u of list?.users ?? []) {
  if ((u.email ?? "").startsWith("demo.")) {
    await sb.auth.admin.deleteUser(u.id)
    borrados++
  }
}
console.log(`Usuarios demo.* eliminados: ${borrados}`)
console.log("LIMPIEZA COMPLETA")
