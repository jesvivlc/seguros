// Crea la usuaria inicial del CRM usando la service_role key.
// Uso:  node scripts/create-user.mjs
// Lee SEED_USER_EMAIL / SEED_USER_PASSWORD de .env.local (o del entorno).

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

// Carga básica de .env.local sin dependencias externas.
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\\n/g, "")
      }
    }
  } catch {
    // .env.local opcional si las vars ya están en el entorno.
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.SEED_USER_EMAIL
const password = process.env.SEED_USER_PASSWORD

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}
if (!email || !password) {
  console.error("Faltan SEED_USER_EMAIL o SEED_USER_PASSWORD en .env.local")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})

if (error) {
  if (String(error.message).toLowerCase().includes("already")) {
    console.log(`La usuaria ${email} ya existe. Nada que hacer.`)
    process.exit(0)
  }
  console.error("Error creando la usuaria:", error.message)
  process.exit(1)
}

console.log(`Usuaria creada: ${data.user?.email} (id: ${data.user?.id})`)
console.log("Ya puedes ejecutar el seed y entrar con esas credenciales.")
