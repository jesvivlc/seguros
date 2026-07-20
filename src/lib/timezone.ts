import { parseISO } from "date-fns"

/**
 * Zona horaria de referencia de la aplicación. La correduría opera en España,
 * así que TODOS los cálculos de "hoy", vencimientos y agrupación de tareas se
 * hacen en esta zona, no en la del servidor (Vercel corre en UTC).
 */
export const ZONA_HORARIA = "Europe/Madrid"

/**
 * Fecha civil de "hoy" en `ZONA_HORARIA` como cadena 'yyyy-MM-dd',
 * independiente de la zona horaria del proceso.
 *
 * Usa `Intl` para resolver qué día es en Madrid en el instante dado, de modo
 * que a las 00:30 (hora española) ya devuelve el día nuevo aunque en UTC del
 * servidor todavía sea el día anterior.
 */
export function hoyISOZona(ahora: Date = new Date()): string {
  // El locale 'en-CA' formatea la fecha como ISO: YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora)
}

/**
 * "Hoy" en `ZONA_HORARIA` como `Date` a medianoche local de esa fecha civil.
 *
 * Pensada para aritmética de días de calendario (`differenceInCalendarDays`,
 * `addDays`) y comparaciones de fechas-solo: al construirse desde la cadena
 * 'yyyy-MM-dd', el resultado es la misma fecha civil de Madrid sin depender de
 * la zona horaria del servidor.
 */
export function hoyZona(ahora: Date = new Date()): Date {
  return parseISO(hoyISOZona(ahora))
}
