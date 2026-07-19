import { format, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"

/** Convierte un valor date-ish (string ISO | Date | null) en Date válida o null. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === "string" ? parseISO(value) : value
  return isValid(d) ? d : null
}

/** Fecha en formato español DD/MM/YYYY. */
export function formatFecha(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "dd/MM/yyyy", { locale: es }) : "—"
}

/** Fecha y hora: DD/MM/YYYY HH:mm */
export function formatFechaHora(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "dd/MM/yyyy HH:mm", { locale: es }) : "—"
}

/** Fecha larga: "19 de julio de 2026" */
export function formatFechaLarga(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: es }) : "—"
}

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Importe en EUR con formato español: 1.234,56 € */
export function formatEuros(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number(value) : value
  if (Number.isNaN(n)) return "—"
  return eurFormatter.format(n)
}

/** Nombre completo "Apellidos, Nombre" para ordenación/listados. */
export function nombreCompleto(
  nombre: string | null | undefined,
  apellidos: string | null | undefined
): string {
  const n = (nombre ?? "").trim()
  const a = (apellidos ?? "").trim()
  return [n, a].filter(Boolean).join(" ").trim() || "—"
}

/** Iniciales para avatar. */
export function iniciales(
  nombre: string | null | undefined,
  apellidos: string | null | undefined
): string {
  const n = (nombre ?? "").trim()
  const a = (apellidos ?? "").trim()
  return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase() || "?"
}

/** Formatea un tamaño de bytes en KB/MB legibles. */
export function formatTamano(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}
