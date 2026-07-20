// Aplica un fichero SQL a Supabase vía la Management API.
// Uso: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-migration.mjs <fichero.sql>
// Ref del proyecto: env SUPABASE_PROJECT_REF (por defecto el de este proyecto).
import { readFileSync } from "node:fs"

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = process.env.SUPABASE_PROJECT_REF || "lsjuhqrixvalifcuhrfh"
const file = process.argv[2]

if (!token) { console.error("Falta SUPABASE_ACCESS_TOKEN"); process.exit(1) }
if (!file) { console.error("Uso: node scripts/apply-migration.mjs <fichero.sql>"); process.exit(1) }

const sql = readFileSync(file, "utf8")
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
console.log("HTTP", res.status)
console.log(text.slice(0, 2000))
if (!res.ok) process.exit(1)
console.log("MIGRACIÓN APLICADA:", file)
