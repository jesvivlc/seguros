import { z } from "zod"

export const tareaSchema = z.object({
  cliente_id: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, "Cliente inválido"),
  poliza_id: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined))
    .refine((v) => !v || z.string().uuid().safeParse(v).success, "Póliza inválida"),
  tipo: z.enum([
    "llamar",
    "enviar_comparativa",
    "recordar_pago",
    "solicitar_documentacion",
    "revisar_renovacion",
    "reunion",
    "cumpleanos",
    "otro",
  ]),
  titulo: z.string().trim().min(1, "El título es obligatorio").max(160),
  descripcion: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  fecha_vencimiento: z
    .string()
    .min(1, "La fecha es obligatoria")
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida"),
  hora: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
})

export type TareaFormValues = z.output<typeof tareaSchema>
