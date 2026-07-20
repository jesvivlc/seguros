// Siembra datos ficticios para probar multi-tenancy.
// Crea 2 corredurías DEMO (una 'compartida', otra 'por_agente') con admins,
// agentes y cartera. Idempotente: borra las DEMO previas antes de recrear.
// Uso: node scripts/seed-demo.mjs
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Faltan credenciales"); process.exit(1) }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const PASSWORD = "Demo1234!"
const iso = (d) => d.toISOString().slice(0, 10)
const hoy = new Date()
const enDias = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return iso(d) }

// --- Limpieza de DEMO previas ------------------------------------------------
const { data: prevCorr } = await sb.from("corredurias").select("id").ilike("nombre", "DEMO %")
for (const c of prevCorr ?? []) await sb.from("corredurias").delete().eq("id", c.id) // cascada
const { data: users } = await sb.auth.admin.listUsers()
for (const u of users?.users ?? []) {
  if ((u.email ?? "").startsWith("demo.")) await sb.auth.admin.deleteUser(u.id)
}

// --- Helpers ----------------------------------------------------------------
async function crearUsuario(email, correduria_id, rol, nombre) {
  const { data: created, error } = await sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !created.user) throw new Error(`crearUsuario ${email}: ${error?.message}`)
  const { error: e2 } = await sb.from("perfiles").upsert(
    { user_id: created.user.id, correduria_id, rol, nombre_completo: nombre, activo: true },
    { onConflict: "user_id" }
  )
  if (e2) throw new Error(`perfil ${email}: ${e2.message}`)
  return created.user.id
}

async function crearCliente(correduria_id, agenteId, nombre, apellidos) {
  const { data, error } = await sb.from("clientes")
    .insert({ correduria_id, user_id: agenteId, nombre, apellidos, estado: "activo" })
    .select("id").single()
  if (error) throw new Error(`cliente ${nombre}: ${error.message}`)
  return data.id
}

async function crearPoliza(correduria_id, agenteId, cliente_id, compania, numero) {
  const { error } = await sb.from("polizas").insert({
    correduria_id, user_id: agenteId, cliente_id, compania, numero_poliza: numero,
    tipo: "auto", fecha_efecto: enDias(-300), fecha_vencimiento: enDias(20),
    forma_pago: "anual", estado: "vigente", coberturas: [],
  })
  if (error) throw new Error(`poliza ${numero}: ${error.message}`)
}

async function crearTarea(correduria_id, agenteId, cliente_id, titulo) {
  const { error } = await sb.from("tareas").insert({
    correduria_id, user_id: agenteId, cliente_id, tipo: "llamar",
    titulo, fecha_vencimiento: enDias(0), estado: "pendiente",
  })
  if (error) throw new Error(`tarea ${titulo}: ${error.message}`)
}

async function crearCorreduria(nombre, visibilidad) {
  const { data, error } = await sb.from("corredurias").insert({ nombre, visibilidad }).select("id").single()
  if (error) throw new Error(`correduria ${nombre}: ${error.message}`)
  return data.id
}

// --- Correduría A: COMPARTIDA -----------------------------------------------
const A = await crearCorreduria("DEMO Seguros Levante", "compartida")
const aAdmin = await crearUsuario("demo.levante.admin@example.com", A, "admin", "Admin Levante")
const aAna = await crearUsuario("demo.levante.ana@example.com", A, "agente", "Ana Torres")
const aLuis = await crearUsuario("demo.levante.luis@example.com", A, "agente", "Luis Gil")
const cA1 = await crearCliente(A, aAna, "María", "López")
const cA2 = await crearCliente(A, aLuis, "Jorge", "Ramírez")
await crearPoliza(A, aAna, cA1, "Mapfre", "LEV-001")
await crearPoliza(A, aLuis, cA2, "Allianz", "LEV-002")
await crearTarea(A, aAna, cA1, "Llamar a María (renovación)")
await crearTarea(A, aLuis, cA2, "Enviar comparativa a Jorge")

// --- Correduría B: POR AGENTE -----------------------------------------------
const B = await crearCorreduria("DEMO Correduría Norte", "por_agente")
const bAdmin = await crearUsuario("demo.norte.admin@example.com", B, "admin", "Admin Norte")
const bMarta = await crearUsuario("demo.norte.marta@example.com", B, "agente", "Marta Ruiz")
const bPedro = await crearUsuario("demo.norte.pedro@example.com", B, "agente", "Pedro Sanz")
const cB1 = await crearCliente(B, bMarta, "Elena", "Díaz")
const cB2 = await crearCliente(B, bPedro, "Raúl", "Moreno")
await crearPoliza(B, bMarta, cB1, "AXA", "NOR-001")
await crearPoliza(B, bPedro, cB2, "Generali", "NOR-002")
await crearTarea(B, bMarta, cB1, "Llamar a Elena")
await crearTarea(B, bPedro, cB2, "Revisar póliza de Raúl")

console.log(JSON.stringify({
  A: { id: A, visibilidad: "compartida", admin: "demo.levante.admin@example.com", agentes: ["demo.levante.ana@example.com","demo.levante.luis@example.com"] },
  B: { id: B, visibilidad: "por_agente", admin: "demo.norte.admin@example.com", agentes: ["demo.norte.marta@example.com","demo.norte.pedro@example.com"] },
  password: PASSWORD,
}, null, 2))
console.log("SEED OK")
