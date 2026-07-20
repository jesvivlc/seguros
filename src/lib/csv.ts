type Celda = string | number | null | undefined

function escapar(v: Celda): string {
  const s = v === null || v === undefined ? "" : String(v)
  // Separador `;` y BOM abajo → Excel en español lo abre en columnas directo.
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV con separador `;` y BOM UTF-8 (para que Excel respete acentos). */
export function toCSV(headers: string[], rows: Celda[][]): string {
  const lineas = [
    headers.map(escapar).join(";"),
    ...rows.map((r) => r.map(escapar).join(";")),
  ]
  return "﻿" + lineas.join("\r\n")
}
