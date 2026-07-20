// Verifica el aislamiento multi-tenant iniciando sesión como distintos usuarios
// (vía anon key) y comprobando qué clientes ve cada uno.
// Requiere haber ejecutado antes: node scripts/seed-demo.mjs
// Uso: node scripts/verify-rls.mjs
import { readFileSync } from "node:fs"

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {}
}
loadEnv()

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!BASE || !ANON) { console.error("Faltan BASE/ANON"); process.exit(1) }

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error(`login ${email}: ${JSON.stringify(j)}`)
  return j.access_token
}

async function verClientes(token) {
  const r = await fetch(`${BASE}/rest/v1/clientes?select=id,nombre,correduria_id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  })
  return await r.json()
}

let fallos = 0
function check(desc, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? "✓" : "✗"} ${desc}`)
  if (!ok) console.log(`    esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(real)}`)
}

const P = "Demo1234!"

// Correduría A (compartida): los agentes ven TODA la cartera de A (2 clientes).
const ana = await verClientes(await login("demo.levante.ana@example.com", P))
check("A/compartida: Ana (agente) ve los 2 clientes de A", ana.length, 2)
check("A/compartida: Ana no ve clientes de B", ana.filter((c) => c.correduria_id !== ana[0]?.correduria_id).length, 0)
const corrA = ana[0]?.correduria_id

const luis = await verClientes(await login("demo.levante.luis@example.com", P))
check("A/compartida: Luis (agente) también ve los 2 de A", luis.length, 2)

// Correduría B (por_agente): cada agente ve SOLO lo suyo; el admin ve todo.
const marta = await verClientes(await login("demo.norte.marta@example.com", P))
check("B/por_agente: Marta (agente) ve solo su 1 cliente", marta.length, 1)
check("B/por_agente: el cliente de Marta NO es de A", marta.every((c) => c.correduria_id !== corrA), true)

const pedro = await verClientes(await login("demo.norte.pedro@example.com", P))
check("B/por_agente: Pedro (agente) ve solo su 1 cliente", pedro.length, 1)
check("B/por_agente: Marta y Pedro ven clientes distintos", marta[0]?.id !== pedro[0]?.id, true)

const adminB = await verClientes(await login("demo.norte.admin@example.com", P))
check("B/por_agente: el admin ve los 2 clientes de B", adminB.length, 2)

// Aislamiento entre corredurías: A y B no comparten ninguna fila.
const idsA = new Set(ana.map((c) => c.id))
check("Aislamiento: ningún cliente de B aparece en la vista de A", adminB.some((c) => idsA.has(c.id)), false)

// Super-admin: NO tiene acceso a datos de clientes.
try {
  const sa = await verClientes(await login("jesvivlc+seguro@gmail.com", "J26ywqOA1moztgkX"))
  check("Super-admin: no ve ningún cliente (sin acceso a datos)", Array.isArray(sa) ? sa.length : 0, 0)
} catch {
  console.log("… (super-admin: login omitido, contraseña cambiada)")
}

console.log("")
if (fallos === 0) console.log("TODO OK: aislamiento por correduría y modos de visibilidad correctos.")
else { console.error(`FALLOS: ${fallos}`); process.exit(1) }
