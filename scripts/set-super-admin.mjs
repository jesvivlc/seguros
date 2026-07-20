// Marca un usuario existente como super-admin de la plataforma.
// Uso: node scripts/set-super-admin.mjs <email>
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
      }
    }
  } catch {
    // .env.local opcional
  }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
if (!email) {
  console.error("Uso: node scripts/set-super-admin.mjs <email>")
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: list, error: e1 } = await sb.auth.admin.listUsers()
if (e1) {
  console.error(e1.message)
  process.exit(1)
}
const u = list.users.find((x) => x.email === email)
if (!u) {
  console.error(`No existe el usuario ${email}`)
  process.exit(1)
}

const { error } = await sb
  .from("perfiles")
  .upsert({ user_id: u.id, es_super_admin: true, activo: true }, { onConflict: "user_id" })
if (error) {
  console.error(error.message)
  process.exit(1)
}
console.log(`OK: ${email} es super-admin (id ${u.id})`)
