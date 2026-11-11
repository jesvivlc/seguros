// Redacción de datos personales en texto libre antes de enviarlo a una API de
// IA. Es una red de seguridad (no sustituye a enviar solo lo necesario): cubre
// los patrones más habituales en notas de un CRM de seguros.

const DNI_NIE = /\b[XYZxyz]?\d{7,8}[-\s]?[A-Za-z]\b/g
const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g
// Teléfonos españoles (9 dígitos, con espacios/puntos/guiones, prefijo opcional).
const TELEFONO = /(?<!\d)(?:\+?34[\s.-]?)?[6789](?:[\s.-]?\d){8}(?!\d)/g
// Solo IBAN numéricos tras el país (el español lo es).
const IBAN = /\b[A-Za-z]{2}\d{2}(?:[\s-]?\d{4}){4,7}(?:[\s-]?\d{1,4})?\b/g
// Matrículas actuales (1234 ABC).
const MATRICULA = /\b\d{4}[\s-]?[B-DF-HJ-NP-TV-Z]{3}\b/g

// Direcciones: tipo de vía + resto hasta coma/punto y coma/punto; y «CP 46001».
const DIRECCION =
  /\b(?:c\/|calle|avda\.?|avenida|plaza|pza\.?|paseo|camino|carretera|ronda|travesía|urbanización)\s+[^,;.\n]{1,60}/giu
const CODIGO_POSTAL = /\b(?:c\.?\s?p\.?|código postal)\s*:?\s*\d{5}\b/giu

const ACENTOS: Record<string, string> = {
  a: "aáàäâ", e: "eéèëê", i: "iíìïî", o: "oóòöô", u: "uúùüû", n: "nñ",
}

/** Patrón de una palabra que ignora mayúsculas y acentos (José = Jose = JOSÉ). */
function patronPalabra(palabra: string): string {
  return palabra
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((ch) => (ACENTOS[ch] ? `[${ACENTOS[ch]}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("")
}

/**
 * Sustituye por marcadores: email, IBAN, DNI/NIE, teléfono, matrícula y las
 * palabras de `nombres` (nombre y apellidos del cliente, p. ej.).
 */
export function anonimizar(texto: string, nombres: string[] = []): string {
  let out = texto
    .replace(EMAIL, "[email]")
    .replace(IBAN, "[iban]")
    .replace(DNI_NIE, "[documento]")
    .replace(MATRICULA, "[matrícula]")
    .replace(TELEFONO, "[teléfono]")
    .replace(CODIGO_POSTAL, "[cp]")
    .replace(DIRECCION, "[dirección]")
  const palabras = [
    ...new Set(
      nombres
        .flatMap((n) => n.split(/\s+/))
        .map((p) => p.trim())
        .filter((p) => p.length >= 3)
    ),
  ]
  if (palabras.length > 0) {
    const re = new RegExp(`(?<![\\p{L}])(?:${palabras.map(patronPalabra).join("|")})(?![\\p{L}])`, "giu")
    out = out.replace(re, "el cliente")
  }
  return out
}
