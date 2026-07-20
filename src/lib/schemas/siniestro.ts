import { z } from "zod"

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

const importeOpcional = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."))
    return Number.isNaN(n) ? undefined : n
  })
  .refine((v) => v === undefined || v >= 0, "El importe no puede ser negativo")

const fechaOpcional = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined))
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida")

export const siniestroSchema = z.object({
  cliente_id: z.string().uuid("Cliente inválido"),
  poliza_id: z.string().uuid("Selecciona una póliza"),
  numero_siniestro: textoOpcional,
  tipo: z.enum(["danos", "robo", "incendio", "agua", "rc", "lesiones", "otro"]),
  estado: z
    .enum(["abierto", "en_tramite", "pericial", "resuelto", "rechazado", "cerrado"])
    .default("abierto"),
  fecha_ocurrencia: fechaOpcional,
  fecha_apertura: fechaOpcional,
  descripcion: textoOpcional,
  importe_estimado: importeOpcional,
  importe_indemnizado: importeOpcional,
  observaciones: textoOpcional,
})

export type SiniestroFormInput = z.input<typeof siniestroSchema>
export type SiniestroFormValues = z.output<typeof siniestroSchema>
