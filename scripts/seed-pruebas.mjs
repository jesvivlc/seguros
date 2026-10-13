// Siembra una correduría de PRUEBAS con cartera realista, para que alguien
// pueda probar la app con datos que se parezcan a los suyos (a diferencia de
// seed-demo.mjs, que solo verifica el aislamiento multi-tenant con 2 clientes).
//
// Idempotente: borra la correduría "(PRUEBAS)" previa y sus usuarios antes de
// recrear. NO toca las corredurías DEMO ni el super-admin.
//
// Los dos clientes cuyas pólizas vencen a 30 y 7 días llevan email real (una
// subdirección del titular), para que el cron de recordatorios tenga algo que
// enviar y se pueda ver el email de verdad. El resto van sin email, que además
// es lo normal en una cartera traída de Excel.
//
// Uso: node scripts/seed-pruebas.mjs
import { readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
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
if (!url || !key) { console.error("Faltan credenciales en .env.local"); process.exit(1) }
// service_role: supabase-js sin cookies. Toda query lleva su correduria_id/user_id
// explícito porque aquí no hay RLS que acote nada.
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Escribe con service_role y empieza BORRANDO la correduría de pruebas anterior
// en cascada. Para que no se lance por error contra un proyecto que no toca,
// exige confirmación explícita y dice a qué proyecto va.
const REF = (/https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url) ?? [])[1] ?? url
if (process.env.SEED_CONFIRM !== "1") {
  console.error(`Este script BORRA y recrea la correduría de pruebas en el proyecto: ${REF}`)
  console.error("Si es el proyecto correcto, relánzalo con SEED_CONFIRM=1")
  process.exit(1)
}

const CORREDURIA = "Correduría Mediterráneo (PRUEBAS)"
// La marca de "esto es la semilla" es el CIF, no el nombre: el nombre lo puede
// editar cualquier admin desde /equipo, y entonces el borrado de la tirada
// anterior apuntaría a una correduría que no es esta. El CIF no se toca desde
// la UI y lo fija este script.
const CIF_SEMILLA = "B54872310"
// La contraseña NO se versiona: este repositorio es público. Se toma de
// SEED_PASSWORD y, si no está, se genera al azar y se imprime al terminar.
const PASSWORD = process.env.SEED_PASSWORD || `Pr${randomBytes(9).toString("base64url")}!`
const BUCKET = "documentos"

// Emails de los tres logins. Salen del entorno para no publicar direcciones
// reales en un repo público; por defecto, @example.com.
const EMAIL_ADMIN  = process.env.SEED_EMAIL_ADMIN  || "pruebas.admin@example.com"
const EMAIL_AGENTE = process.env.SEED_EMAIL_AGENTE || "pruebas.agente@example.com"
const EMAIL_PORTAL = process.env.SEED_EMAIL_PORTAL || "pruebas.portal@example.com"
const MIOS = [EMAIL_ADMIN, EMAIL_AGENTE, EMAIL_PORTAL]

// Las dos pólizas que vencen a 30 y 7 días son las que dispara el cron de
// recordatorios. Si se dan direcciones reales en el entorno, esos dos clientes
// las llevan y el correo se puede ver de verdad; si no, se siembran SIN email y
// el cron los salta. Nunca @example.com en un cliente con vencimiento en la
// ventana: Resend rebotaría y eso desgasta la reputación del dominio de envío.
const EMAIL_AVISO_7  = process.env.SEED_EMAIL_AVISO_7 || null
const EMAIL_AVISO_30 = process.env.SEED_EMAIL_AVISO_30 || null

const iso = (d) => d.toISOString().slice(0, 10)
const hoy = new Date()
const enDias = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return iso(d) }
/** Cumpleaños a n días de hoy, con el año de nacimiento dado. */
const cumple = (n, anio) => {
  const d = new Date(hoy); d.setDate(d.getDate() + n)
  return `${anio}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
/** Letra del DNI (módulo 23), para que los documentos parezcan de verdad. */
const dni = (n) => `${n}${"TRWAGMYFPDXBNJZSQVHLCKE"[Number(n) % 23]}`

// ---------------------------------------------------------------------------
// Limpieza de la tirada anterior
// ---------------------------------------------------------------------------
/** Lista una carpeta del bucket entera, paginando. */
async function listarTodo(prefijo) {
  const todo = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefijo, { limit: 100, offset })
    if (error) throw new Error(`storage list ${prefijo}: ${error.message}`)
    todo.push(...(data ?? []))
    if ((data ?? []).length < 100) return todo
  }
}

// Se busca por CIF, no por nombre (ver CIF_SEMILLA). Si el select falla, se
// aborta: con `prev ?? []` un error dejaría el bucle vacío en silencio y el
// script crearía una segunda correduría de pruebas duplicada.
const { data: prev, error: ePrev } = await sb.from("corredurias").select("id,nombre").eq("cif", CIF_SEMILLA)
if (ePrev) { console.error(`No se pudo buscar la correduría de pruebas previa: ${ePrev.message}`); process.exit(1) }
for (const c of prev ?? []) {
  console.log(`borrando la tirada anterior: ${c.nombre} (${c.id})`)
  for (const carpeta of await listarTodo(c.id)) {
    const ficheros = await listarTodo(`${c.id}/${carpeta.name}`)
    const rutas = ficheros.map((f) => `${c.id}/${carpeta.name}/${f.name}`)
    if (rutas.length) {
      const { error } = await sb.storage.from(BUCKET).remove(rutas)
      if (error) throw new Error(`storage remove: ${error.message}`)
    }
  }
  const { error } = await sb.from("corredurias").delete().eq("id", c.id)   // cascada al resto
  if (error) throw new Error(`borrado de ${c.id}: ${error.message}`)
}
const { data: usuarios } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
for (const u of usuarios?.users ?? []) {
  if (MIOS.includes(u.email ?? "")) await sb.auth.admin.deleteUser(u.id)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function crearUsuario(email, correduria_id, rol, nombre) {
  const { data, error } = await sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw new Error(`usuario ${email}: ${error?.message}`)
  const { error: e2 } = await sb.from("perfiles").upsert(
    { user_id: data.user.id, correduria_id, rol, nombre_completo: nombre, activo: true },
    { onConflict: "user_id" }
  )
  if (e2) throw new Error(`perfil ${email}: ${e2.message}`)
  return data.user.id
}

async function insertar(tabla, filas) {
  const { data, error } = await sb.from(tabla).insert(filas).select("id")
  if (error) throw new Error(`${tabla}: ${error.message}`)
  return data.map((r) => r.id)
}

/** PDF de una página, válido (xref calculado), para que el visor lo abra. */
function pdf(titulo, lineas) {
  const texto = [`BT /F1 16 Tf 56 780 Td (${titulo}) Tj ET`]
  lineas.forEach((l, i) => texto.push(`BT /F1 10 Tf 56 ${744 - i * 16} Td (${l}) Tj ET`))
  const stream = texto.join("\n")
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ]
  let cuerpo = "%PDF-1.4\n"
  const offsets = []
  objs.forEach((o, i) => { offsets.push(cuerpo.length); cuerpo += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const inicioXref = cuerpo.length
  cuerpo += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) cuerpo += `${String(off).padStart(10, "0")} 00000 n \n`
  cuerpo += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${inicioXref}\n%%EOF\n`
  return Buffer.from(cuerpo, "latin1")
}

async function subirDocumento(correduria_id, agenteId, cliente_id, poliza_id, categoria, nombre, titulo, lineas) {
  const bytes = pdf(titulo, lineas)
  const path = `${correduria_id}/${cliente_id}/${Date.now()}-${nombre.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false })
  if (error) throw new Error(`storage ${nombre}: ${error.message}`)
  await insertar("documentos", [{
    correduria_id, user_id: agenteId, cliente_id, poliza_id, categoria, nombre,
    storage_path: path, mime_type: "application/pdf", tamano_bytes: bytes.length,
  }])
}

// ---------------------------------------------------------------------------
// Correduría y usuarios
// ---------------------------------------------------------------------------
const { data: corr, error: eCorr } = await sb.from("corredurias")
  .insert({ nombre: CORREDURIA, cif: CIF_SEMILLA, visibilidad: "compartida", activa: true })
  .select("id").single()
if (eCorr) throw new Error(`correduria: ${eCorr.message}`)
const C = corr.id

const SARA = await crearUsuario(EMAIL_ADMIN, C, "admin", "Sara (pruebas)")
const CARLOS = await crearUsuario(EMAIL_AGENTE, C, "agente", "Carlos Ibáñez")

// ---------------------------------------------------------------------------
// Cartera
// Vencimientos repartidos para que el semáforo muestre sus cuatro niveles:
// verde >60 d · amarillo ≤60 d · rojo ≤30 d · vencida. Los de 30 y 7 días
// exactos son los que dispara el cron de recordatorios.
// ---------------------------------------------------------------------------
const COB = {
  auto: [
    { nombre: "Responsabilidad civil obligatoria", capital: "70.000.000 €", franquicia: "" },
    { nombre: "Daños propios", capital: "Valor venal", franquicia: "300 €" },
    { nombre: "Lunas", capital: "Íntegra", franquicia: "" },
    { nombre: "Asistencia en viaje", capital: "Desde km 0", franquicia: "" },
  ],
  hogar: [
    { nombre: "Continente", capital: "180.000 €", franquicia: "" },
    { nombre: "Contenido", capital: "45.000 €", franquicia: "" },
    { nombre: "Responsabilidad civil familiar", capital: "300.000 €", franquicia: "" },
    { nombre: "Daños por agua", capital: "Incluido", franquicia: "" },
  ],
  salud: [
    { nombre: "Asistencia primaria y especialidades", capital: "Sin copago", franquicia: "" },
    { nombre: "Hospitalización", capital: "Ilimitada", franquicia: "" },
    { nombre: "Dental", capital: "Franquicia dental", franquicia: "" },
  ],
  vida: [
    { nombre: "Fallecimiento", capital: "150.000 €", franquicia: "" },
    { nombre: "Invalidez permanente absoluta", capital: "150.000 €", franquicia: "" },
  ],
  comercio: [
    { nombre: "Continente", capital: "120.000 €", franquicia: "" },
    { nombre: "Existencias", capital: "60.000 €", franquicia: "" },
    { nombre: "RC explotación", capital: "600.000 €", franquicia: "" },
    { nombre: "Pérdida de beneficios", capital: "12 meses", franquicia: "" },
  ],
  rc: [
    { nombre: "RC profesional", capital: "600.000 €", franquicia: "600 €" },
    { nombre: "Defensa jurídica", capital: "60.000 €", franquicia: "" },
  ],
  decesos: [{ nombre: "Servicio de sepelio", capital: "5.500 €", franquicia: "" }],
  comunidad: [
    { nombre: "Continente", capital: "2.400.000 €", franquicia: "" },
    { nombre: "RC de la comunidad", capital: "600.000 €", franquicia: "" },
    { nombre: "Daños por agua", capital: "Incluido", franquicia: "600 €" },
  ],
}

const CARTERA = [
  { n: "María", a: "López Server", d: "48213764", nac: cumple(2, 1979), tel: "612 448 903", em: EMAIL_PORTAL,
    dir: "C/ Castaños 14, 3º B", cp: "03001", pob: "Alicante", prov: "Alicante", prof: "Farmacéutica",
    civ: "Casado/a", est: "activo", org: "Recomendación de cliente", ag: "sara", portal: true,
    pol: [
      { c: "Mapfre", num: "0074412890", t: "auto", mat: "4821 KZT", ef: -320, v: 45, p: 486.2, fp: "anual" },
      { c: "Catalana Occidente", num: "HOG-0098441", t: "hogar", ef: -210, v: 155, p: 312.4, fp: "semestral" },
      { c: "Adeslas", num: "SAL-77120934", t: "salud", ef: -400, v: 330, p: 1284.0, fp: "mensual" },
    ] },
  { n: "Jorge", a: "Ramírez Peiró", d: "21874390", nac: "1986-03-22", tel: "655 120 744", em: EMAIL_AVISO_7,
    dir: "Avda. de la Constitución 88", cp: "03201", pob: "Elche", prov: "Alicante", prof: "Autónomo (fontanería)",
    civ: "Casado/a", est: "activo", org: "Web", ag: "carlos",
    pol: [
      { c: "Allianz", num: "AL-2451190", t: "auto", mat: "7730 JLM", ef: -290, v: 7, p: 612.8, fp: "anual" },
      { c: "Reale", num: "RC-884120", t: "rc", ef: -180, v: 185, p: 742.0, fp: "anual" },
    ] },
  { n: "Elena", a: "Díaz Montoro", d: "33901247", nac: cumple(5, 1991), tel: "677 903 118", em: null,
    dir: "C/ Sant Vicent 3", cp: "03801", pob: "Alcoy", prov: "Alicante", prof: "Profesora",
    civ: "Soltero/a", est: "activo", org: "Campaña hogar", ag: "sara",
    pol: [
      { c: "AXA", num: "AX-5590187", t: "hogar", ef: -150, v: 215, p: 268.9, fp: "anual" },
      { c: "Santalucía", num: "DEC-119087", t: "decesos", ef: -600, v: 120, p: 221.4, fp: "mensual" },
    ] },
  { n: "Raúl", a: "Moreno Beltrán", d: "52118430", nac: "1974-11-09", tel: "698 441 220", em: null,
    dir: "Partida Benadresa 41", cp: "12080", pob: "Castellón", prov: "Castellón", prof: "Transportista",
    civ: "Divorciado/a", est: "activo", org: "Recomendación de cliente", ag: "carlos",
    pol: [
      { c: "Pelayo", num: "PE-0098712", t: "auto", mat: "1194 HRB", ef: -340, v: 26, p: 721.5, fp: "trimestral" },
      { c: "Generali", num: "GE-7781204", t: "vida", ef: -500, v: 240, p: 384.0, fp: "anual" },
    ] },
  { n: "Antonio", a: "Giner Pastor", d: "19043821", nac: "1962-06-14", tel: "965 214 887", em: null,
    dir: "C/ Major 27", cp: "03700", pob: "Dénia", prov: "Alicante", prof: "Hostelería",
    civ: "Casado/a", est: "activo", org: "Cartera histórica", ag: "sara",
    pol: [
      { c: "Zurich", num: "ZU-COM-44190", t: "comercio", ef: -260, v: 38, p: 1480.0, fp: "semestral" },
      { c: "Mapfre", num: "0074780112", t: "hogar", ef: -220, v: 200, p: 341.7, fp: "anual" },
    ] },
  { n: "Carmen", a: "Navarro Tomás", d: "44120983", nac: "1983-01-30", tel: "622 017 554", em: null,
    dir: "C/ Pintor Sorolla 12, 5º", cp: "46002", pob: "Valencia", prov: "Valencia", prof: "Arquitecta",
    civ: "Pareja de hecho", est: "activo", org: "LinkedIn", ag: "carlos",
    pol: [
      { c: "Hiscox", num: "HX-RC-20884", t: "rc", ef: -120, v: 59, p: 918.0, fp: "anual" },
      { c: "DKV", num: "DKV-4418203", t: "salud", ef: -310, v: 300, p: 968.4, fp: "mensual" },
    ] },
  { n: "Francisco", a: "Soler Mas", d: "28774109", nac: "1958-09-03", tel: "609 882 143", em: null,
    dir: "Urb. Montecala 22", cp: "03710", pob: "Calpe", prov: "Alicante", prof: "Jubilado",
    civ: "Viudo/a", est: "activo", org: "Cartera histórica", ag: "sara",
    pol: [
      { c: "Occident", num: "OC-0012477", t: "hogar", ef: -700, v: -45, p: 398.2, fp: "anual", est: "vencida" },
      { c: "Santalucía", num: "DEC-220871", t: "decesos", ef: -900, v: 280, p: 296.0, fp: "anual" },
    ] },
  { n: "Lucía", a: "Ferrer Blanch", d: "50338712", nac: "1994-04-17", tel: "634 771 209", em: null,
    dir: "C/ Gravina 9, 2º", cp: "03002", pob: "Alicante", prov: "Alicante", prof: "Diseñadora",
    civ: "Soltero/a", est: "activo", org: "Instagram", ag: "carlos",
    pol: [{ c: "Línea Directa", num: "LD-77120034", t: "auto", mat: "9087 MDK", ef: -100, v: 265, p: 398.4, fp: "mensual" }] },
  { n: "Vicente", a: "Company Ortolá", d: "17290845", nac: "1969-12-01", tel: "617 334 902", em: null,
    dir: "Avda. Jaume I 54", cp: "03760", pob: "Ondara", prov: "Alicante", prof: "Comercial",
    civ: "Casado/a", est: "activo", org: "Recomendación de cliente", ag: "sara",
    pol: [
      { c: "Mutua Madrileña", num: "MM-9981204", t: "auto", mat: "3312 LPC", ef: -270, v: 52, p: 544.0, fp: "semestral" },
      { c: "Allianz", num: "AL-VID-33918", t: "vida", ef: -450, v: 150, p: 216.5, fp: "anual" },
    ] },
  { n: "Rosa", a: "Martí Alemany", d: "39812074", nac: "1977-07-25", tel: "645 118 390", em: null,
    dir: "C/ La Mar 71", cp: "03730", pob: "Jávea", prov: "Alicante", prof: "Gestora inmobiliaria",
    civ: "Casado/a", est: "activo", org: "Web", ag: "carlos",
    pol: [{ c: "AXA", num: "AX-CDAD-8871", t: "comunidad", ef: -190, v: 95, p: 2480.0, fp: "trimestral" }] },
  { n: "Miguel Ángel", a: "Esteve Ripoll", d: "46700213", nac: "1990-02-11", tel: "688 420 117", em: null,
    dir: "C/ Sant Pere 8", cp: "03680", pob: "Aspe", prov: "Alicante", prof: "Mecánico",
    civ: "Soltero/a", est: "activo", org: "Campaña auto", ag: "sara",
    pol: [{ c: "Reale", num: "RE-0077129", t: "auto", mat: "6654 NBT", ef: -60, v: 305, p: 467.3, fp: "anual" }] },
  { n: "Pilar", a: "Climent Orozco", d: "31008476", nac: "1981-05-19", tel: "650 773 004", em: EMAIL_AVISO_30,
    dir: "C/ Benissa 3", cp: "03720", pob: "Benissa", prov: "Alicante", prof: "Enfermera",
    civ: "Casado/a", est: "activo", org: "Recomendación de cliente", ag: "carlos",
    pol: [
      { c: "Asisa", num: "AS-5541028", t: "salud", ef: -220, v: 30, p: 742.8, fp: "mensual" },
      { c: "Generali", num: "GE-HOG-77120", t: "hogar", ef: -330, v: -12, p: 254.0, fp: "anual", est: "vencida" },
    ] },
  { n: "Óscar", a: "Vidal Puchades", d: "27741093", nac: "1988-10-28", tel: "627 904 551", em: null,
    dir: "C/ Colón 40", cp: "46004", pob: "Valencia", prov: "Valencia", prof: "Hostelería",
    civ: "Soltero/a", est: "potencial", org: "Campaña comercio", ag: "carlos", pol: [] },
  { n: "Nuria", a: "Sanchis Llorens", d: "40192837", nac: "1996-08-07", tel: "671 220 884", em: null,
    dir: "C/ Alcalá Galiano 2", cp: "03002", pob: "Alicante", prov: "Alicante", prof: "Estudiante de máster",
    civ: "Soltero/a", est: "potencial", org: "Web", ag: "sara", pol: [] },
  { n: "Josep", a: "Bonet Escrivà", d: "18874320", nac: "1965-03-12", tel: "963 884 201", em: null,
    dir: "Pl. del Mercat 11", cp: "46700", pob: "Gandía", prov: "Valencia", prof: "Comerciante",
    civ: "Casado/a", est: "inactivo", org: "Cartera histórica", ag: "sara",
    pol: [{ c: "Zurich", num: "ZU-COM-11983", t: "comercio", ef: -800, v: -210, p: 1120.0, fp: "anual", est: "anulada" }] },
]

const ag = { sara: SARA, carlos: CARLOS }
const ids = {}      // apellido corto -> { cliente, polizas: [] }

for (const p of CARTERA) {
  const dueno = ag[p.ag]
  const [clienteId] = await insertar("clientes", [{
    correduria_id: C, user_id: dueno, nombre: p.n, apellidos: p.a, dni_nie: dni(p.d),
    fecha_nacimiento: p.nac, profesion: p.prof, estado_civil: p.civ, telefono: p.tel,
    email: p.em, direccion: p.dir, codigo_postal: p.cp, poblacion: p.pob, provincia: p.prov,
    estado: p.est, origen: p.org,
  }])
  const polizas = []
  for (const q of p.pol) {
    const [pid] = await insertar("polizas", [{
      correduria_id: C, user_id: dueno, cliente_id: clienteId, compania: q.c,
      numero_poliza: q.num, tipo: q.t, matricula: q.mat ?? null,
      riesgo_asegurado: q.t === "auto" ? q.mat : `${p.dir}, ${p.pob}`,
      fecha_efecto: enDias(q.ef), fecha_vencimiento: enDias(q.v),
      prima_anual: q.p, forma_pago: q.fp, coberturas: COB[q.t] ?? [],
      estado: q.est ?? "vigente",
    }])
    polizas.push(pid)
  }
  ids[p.n] = { cliente: clienteId, polizas, dueno, portal: p.portal === true }
}

// ---------------------------------------------------------------------------
// Interacciones — el timeline es lo que hace que la ficha parezca viva
// ---------------------------------------------------------------------------
const INT = [
  ["María", 0, -3, "llamada", "Avisada de la renovación del auto", "Quiere comparar con Allianz antes de renovar. Volver a llamar el viernes."],
  ["María", 2, -14, "email", "Enviada tarjeta sanitaria de Adeslas", null],
  ["María", 0, -58, "renovacion", "Renovada la póliza de auto con subida del 4 %", "Acepta la subida; se mantiene la franquicia de 300 €."],
  ["Jorge", 0, -2, "whatsapp", "Recordatorio de vencimiento del auto", "Pide presupuesto alternativo; manda ficha técnica por WhatsApp."],
  ["Jorge", 1, -21, "presupuesto", "Presupuesto de RC profesional de Reale", "742 € anuales con 600 € de franquicia."],
  ["Jorge", null, -70, "reunion", "Visita en el taller para revisar coberturas", null],
  ["Elena", 0, -9, "llamada", "Consulta por ampliación de contenido del hogar", "Sube el contenido a 60.000 €; pendiente de suplemento."],
  ["Elena", null, -40, "nota", "Prefiere que la llamemos por las tardes", null],
  ["Raúl", 0, -5, "llamada", "Renovación del auto: pide fraccionar el pago", "Pasa a trimestral desde la próxima renovación."],
  ["Raúl", 1, -33, "documento", "Recibido certificado médico para la de vida", null],
  ["Antonio", 0, -6, "reunion", "Revisión del comercio tras la ampliación del local", "Sube continente a 150.000 €. Pendiente de peritación."],
  ["Antonio", 0, -47, "email", "Enviada copia de la póliza de comercio", null],
  ["Carmen", 0, -11, "presupuesto", "Comparativa de RC profesional (Hiscox / Zurich / AXA)", "Se queda con Hiscox por el límite de defensa jurídica."],
  ["Carmen", 1, -62, "cambio", "Cambio de forma de pago de la de salud a mensual", null],
  ["Francisco", 0, -1, "llamada", "Hogar vencida hace 45 días: ofrecemos reactivar", "Lo consulta con su hija. Reintentar la semana que viene."],
  ["Lucía", 0, -17, "whatsapp", "Alta del auto y envío del recibo", null],
  ["Vicente", 0, -8, "email", "Enviada comparativa de renovación del auto", null],
  ["Vicente", 1, -29, "nota", "Interesado en salud familiar para el año que viene", null],
  ["Rosa", 0, -13, "reunion", "Junta de la comunidad: revisión de la póliza", "Piden añadir cobertura de avería de maquinaria del ascensor."],
  ["Pilar", 0, -4, "llamada", "Salud vence en un mes: confirma renovación", null],
  ["Pilar", 1, -26, "renovacion", "Hogar vencida: no quiere renovar con Generali", "Pedir alternativa a Mapfre y Occident."],
  ["Óscar", null, -7, "llamada", "Primer contacto: seguro de comercio para el bar", "Abre en noviembre. Pedirle metros y existencias."],
  ["Nuria", null, -19, "email", "Pide presupuesto de auto para coche de segunda mano", "Aún no lo ha comprado."],
  ["Josep", null, -150, "nota", "Traspasó el negocio; cartera inactiva", null],
]
await insertar("interacciones", INT.map(([nombre, idxPol, dias, tipo, resumen, detalle]) => ({
  correduria_id: C, user_id: ids[nombre].dueno, cliente_id: ids[nombre].cliente,
  poliza_id: idxPol === null ? null : ids[nombre].polizas[idxPol] ?? null,
  tipo, resumen, detalle, fecha: new Date(Date.now() + dias * 864e5).toISOString(),
})))

// ---------------------------------------------------------------------------
// Tareas — algunas para hoy y alguna atrasada, para que "Mi día" tenga carne.
// Las de cumpleaños no se crean a mano: las genera run_daily_jobs().
// ---------------------------------------------------------------------------
await insertar("tareas", [
  ["Jorge", "llamar", "Llamar a Jorge: el auto vence en una semana", 0, "pendiente"],
  ["Pilar", "revisar_renovacion", "Buscar alternativa al hogar de Pilar (Mapfre / Occident)", 0, "pendiente"],
  ["María", "enviar_comparativa", "Enviar a María la comparativa de auto con Allianz", 0, "pendiente"],
  ["Francisco", "llamar", "Reintentar con Francisco la reactivación del hogar", -2, "pendiente"],
  ["Antonio", "solicitar_documentacion", "Pedir a Antonio la peritación del local ampliado", -5, "pendiente"],
  ["Raúl", "recordar_pago", "Confirmar con Raúl el paso a pago trimestral", 2, "pendiente"],
  ["Óscar", "reunion", "Visita al bar de Óscar para tomar datos del comercio", 4, "pendiente"],
  ["Rosa", "enviar_comparativa", "Presupuesto de avería de maquinaria para la comunidad", 6, "pendiente"],
  ["Carmen", "llamar", "Carmen: confirmar datos de la RC profesional", -9, "completada"],
  ["Vicente", "llamar", "Llamada de seguimiento del auto de Vicente", -16, "completada"],
].map(([nombre, tipo, titulo, dias, estado]) => ({
  correduria_id: C, user_id: ids[nombre].dueno, cliente_id: ids[nombre].cliente,
  tipo, titulo, fecha_vencimiento: enDias(dias), estado,
})))

// ---------------------------------------------------------------------------
// Siniestros
// ---------------------------------------------------------------------------
await insertar("siniestros", [
  { cli: "María", pol: 1, tipo: "agua", estado: "en_tramite", num: "SIN-2026-00124", oc: -18, ap: -17,
    desc: "Rotura de bajante en el baño; daños en el piso inferior.", est_imp: 2400.0, ind: null,
    obs: "Perito de Catalana el jueves. Vecino con parte abierto en su compañía." },
  { cli: "Antonio", pol: 0, tipo: "incendio", estado: "resuelto", num: "SIN-2026-00098", oc: -74, ap: -73,
    desc: "Conato de incendio en la cocina del restaurante por freidora.", est_imp: 8600.0, ind: 7940.0,
    obs: "Indemnizado y cerrado. Se recomienda revisión anual de extinción." },
  { cli: "Raúl", pol: 0, tipo: "danos", estado: "pericial", num: "SIN-2026-00141", oc: -9, ap: -8,
    desc: "Granizo en la A-7: daños en capó y techo del vehículo.", est_imp: 1850.0, ind: null,
    obs: "Pendiente de informe pericial. Taller concertado en Castellón." },
  { cli: "Rosa", pol: 0, tipo: "rc", estado: "abierto", num: "SIN-2026-00150", oc: -3, ap: -2,
    desc: "Caída de un vecino en el portal por suelo mojado sin señalizar.", est_imp: 3200.0, ind: null,
    obs: "Reclamación recibida del abogado del perjudicado." },
].map((s) => ({
  correduria_id: C, user_id: ids[s.cli].dueno, cliente_id: ids[s.cli].cliente,
  poliza_id: ids[s.cli].polizas[s.pol], numero_siniestro: s.num, tipo: s.tipo, estado: s.estado,
  fecha_ocurrencia: enDias(s.oc), fecha_apertura: enDias(s.ap), descripcion: s.desc,
  importe_estimado: s.est_imp, importe_indemnizado: s.ind, observaciones: s.obs,
})))

// ---------------------------------------------------------------------------
// Documentos (PDFs de verdad en el bucket privado)
// ---------------------------------------------------------------------------
await subirDocumento(C, ids["María"].dueno, ids["María"].cliente, ids["María"].polizas[0],
  "poliza", "Póliza auto Mapfre 0074412890.pdf", "Condiciones particulares - Auto",
  ["Tomador: Maria Lopez Server", "Compania: Mapfre   Poliza: 0074412890",
   "Vehiculo: 4821 KZT", "Coberturas: RC obligatoria, danos propios (300 EUR),",
   "lunas integra, asistencia desde km 0.", "Prima anual: 486,20 EUR", "", "Documento de PRUEBAS."])

await subirDocumento(C, ids["María"].dueno, ids["María"].cliente, ids["María"].polizas[1],
  "siniestro", "Parte siniestro agua SIN-2026-00124.pdf", "Parte de siniestro",
  ["Expediente: SIN-2026-00124", "Tipo: Danos por agua", "Fecha de ocurrencia: hace 18 dias",
   "Descripcion: rotura de bajante en el bano.", "Importe estimado: 2.400,00 EUR", "", "Documento de PRUEBAS."])

await subirDocumento(C, ids["Antonio"].dueno, ids["Antonio"].cliente, ids["Antonio"].polizas[0],
  "poliza", "Póliza comercio Zurich ZU-COM-44190.pdf", "Condiciones particulares - Comercio",
  ["Tomador: Antonio Giner Pastor", "Compania: Zurich   Poliza: ZU-COM-44190",
   "Riesgo: C/ Major 27, Denia", "Continente 120.000 / Existencias 60.000",
   "RC explotacion 600.000 EUR", "Prima anual: 1.480,00 EUR", "", "Documento de PRUEBAS."])

// ---------------------------------------------------------------------------
// Portal del cliente para María
// ---------------------------------------------------------------------------
const { data: pu, error: ePu } = await sb.auth.admin.createUser({
  email: EMAIL_PORTAL, password: PASSWORD, email_confirm: true,
})
if (ePu) throw new Error(`usuario portal: ${ePu.message}`)
const { error: ePa } = await sb.from("portal_accesos")
  .insert({ user_id: pu.user.id, cliente_id: ids["María"].cliente, activo: true })
if (ePa) throw new Error(`portal_accesos: ${ePa.message}`)

// ---------------------------------------------------------------------------
console.log(JSON.stringify({
  correduria: { id: C, nombre: CORREDURIA, visibilidad: "compartida" },
  accesos: {
    admin: EMAIL_ADMIN, agente: EMAIL_AGENTE, portal: `${EMAIL_PORTAL} (ve la cartera de María López)`,
    // Solo se imprime la generada al azar, que no está en ningún otro sitio. Si
    // viene de SEED_PASSWORD, no se vuelca: acabaría en logs de CI o en un chat.
    password: process.env.SEED_PASSWORD ? "(la de SEED_PASSWORD)" : PASSWORD,
  },
  sembrado: {
    clientes: CARTERA.length,
    polizas: CARTERA.reduce((n, c) => n + c.pol.length, 0),
    interacciones: INT.length, tareas: 10, siniestros: 4, documentos: 3,
  },
}, null, 2))
console.log("SEED PRUEBAS OK")
