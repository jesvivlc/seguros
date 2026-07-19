// Validación de DNI y NIE españoles con verificación de la letra de control.

const LETRAS_CONTROL = "TRWAGMYFPDXBNJZSQVHLCKE"

/** Normaliza: quita espacios/guiones y pasa a mayúsculas. */
export function normalizarDniNie(valor: string): string {
  return valor.replace(/[\s-]/g, "").toUpperCase()
}

/** Calcula la letra de control para un número de 8 dígitos (0-99999999). */
function letraControl(numero: number): string {
  return LETRAS_CONTROL.charAt(numero % 23)
}

/** Valida un DNI: 8 dígitos + letra de control correcta. */
export function esDniValido(valor: string): boolean {
  const v = normalizarDniNie(valor)
  const match = /^(\d{8})([A-Z])$/.exec(v)
  if (!match) return false
  const numero = parseInt(match[1], 10)
  return letraControl(numero) === match[2]
}

/** Valida un NIE: X/Y/Z + 7 dígitos + letra de control correcta. */
export function esNieValido(valor: string): boolean {
  const v = normalizarDniNie(valor)
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(v)
  if (!match) return false
  const prefijoMap: Record<string, string> = { X: "0", Y: "1", Z: "2" }
  const numero = parseInt(prefijoMap[match[1]] + match[2], 10)
  return letraControl(numero) === match[3]
}

/** Valida DNI o NIE indistintamente. */
export function esDniNieValido(valor: string): boolean {
  if (!valor) return false
  return esDniValido(valor) || esNieValido(valor)
}

/** Mensaje de error legible en español, o null si es válido. */
export function validarDniNie(valor: string): string | null {
  const v = normalizarDniNie(valor)
  if (!v) return "El DNI/NIE es obligatorio"
  if (/^\d{8}[A-Z]$/.test(v)) {
    return esDniValido(v) ? null : "La letra del DNI no es correcta"
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    return esNieValido(v) ? null : "La letra del NIE no es correcta"
  }
  return "Formato inválido. DNI: 8 dígitos + letra. NIE: X/Y/Z + 7 dígitos + letra"
}
