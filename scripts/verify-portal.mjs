// Verifica el aislamiento del portal del cliente.
// Crea 2 usuarios-portal ligados a clientes distintos y comprueba que cada uno
// solo ve SU cliente (pólizas/documentos), nada de otros, ni siniestros/tareas,
// y que no puede escribir. Requiere haber ejecutado seed-demo.mjs.
// Uso: node scripts/verify-portal.mjs
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

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(BASE, SVC, { auth: { autoRefreshToken: false, persistSession: false } })
const P = "Demo1234!"

let fallos = 0
function check(desc, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? "✓" : "✗"} ${desc}`)
  if (!ok) console.log(`    esperado ${JSON.stringify(esperado)}, obtenido ${JSON.stringify(real)}`)
}

// --- Setup: 2 clientes de las corredurías DEMO ------------------------------
const { data: cls } = await sb.from("clientes").select("id, nombre, apellidos").in("nombre", ["Elena", "Raúl"])
const elena = cls.find((c) => c.nombre === "Elena")
const raul = cls.find((c) => c.nombre === "Raúl")
if (!elena || !raul) { console.error("Faltan clientes DEMO (ejecuta seed-demo.mjs)"); process.exit(1) }

// Limpia usuarios-portal previos
const { data: users } = await sb.auth.admin.listUsers()
for (const u of users.users) if ((u.email ?? "").startsWith("demo.portal")) await sb.auth.admin.deleteUser(u.id)

async function crearPortal(email, clienteId) {
  const { data: c } = await sb.auth.admin.createUser({ email, password: P, email_confirm: true })
  await sb.from("portal_accesos").upsert({ user_id: c.user.id, cliente_id: clienteId, activo: true }, { onConflict: "user_id" })
  return c.user.id
}
await crearPortal("demo.portal.elena@example.com", elena.id)
await crearPortal("demo.portal.raul@example.com", raul.id)

// --- Como usuario-portal (anon + login) -------------------------------------
async function login(email) {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: P }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error(`login ${email}: ${JSON.stringify(j)}`)
  return j.access_token
}
async function get(token, tabla) {
  const r = await fetch(`${BASE}/rest/v1/${tabla}?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } })
  return await r.json()
}

const tElena = await login("demo.portal.elena@example.com")
const clientesE = await get(tElena, "clientes")
check("Portal Elena: ve exactamente 1 cliente (el suyo)", clientesE.length, 1)
check("Portal Elena: ese cliente es Elena", clientesE[0]?.id, elena.id)

const polE = await get(tElena, "polizas")
check("Portal Elena: solo ve pólizas de su cliente (todas suyas)", polE.length, 1)

const sinE = await get(tElena, "siniestros")
check("Portal Elena: NO ve siniestros (0)", Array.isArray(sinE) ? sinE.length : 0, 0)
const tarE = await get(tElena, "tareas")
check("Portal Elena: NO ve tareas (0)", Array.isArray(tarE) ? tarE.length : 0, 0)

// Aislamiento entre portales
const tRaul = await login("demo.portal.raul@example.com")
const clientesR = await get(tRaul, "clientes")
check("Portal Raúl: ve exactamente 1 cliente (el suyo)", clientesR.length, 1)
check("Portal Raúl: no es el cliente de Elena", clientesR[0]?.id !== elena.id, true)

// Escritura: un usuario-portal NO puede crear ni editar
const rIns = await fetch(`${BASE}/rest/v1/clientes`, {
  method: "POST",
  headers: { apikey: ANON, Authorization: `Bearer ${tElena}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ nombre: "Hacker", apellidos: "Test" }),
})
check("Portal Elena: NO puede insertar clientes (RLS lo bloquea)", rIns.status >= 400, true)

const rUpd = await fetch(`${BASE}/rest/v1/clientes?id=eq.${elena.id}`, {
  method: "PATCH",
  headers: { apikey: ANON, Authorization: `Bearer ${tElena}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ notas: "editado por portal" }),
})
const updBody = await rUpd.json()
check("Portal Elena: un UPDATE de su cliente no modifica nada (solo lectura)", Array.isArray(updBody) ? updBody.length : 0, 0)

console.log("")
if (fallos === 0) console.log("TODO OK: el portal es de solo lectura y está aislado a su cliente.")
else { console.error(`FALLOS: ${fallos}`); process.exit(1) }
