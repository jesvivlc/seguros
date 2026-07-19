import { z } from "zod"

export const interaccionSchema = z.object({
  cliente_id: z.string().uuid(),
  poliza_id: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, "Póliza inválida"),
  tipo: z.enum([
    "llamada",
    "whatsapp",
    "email",
    "reunion",
    "presupuesto",
    "renovacion",
    "nota",
    "documento",
    "cambio",
  ]),
  resumen: z.string().trim().min(1, "Escribe un resumen").max(200),
  detalle: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
})

export type InteraccionFormValues = z.output<typeof interaccionSchema>
