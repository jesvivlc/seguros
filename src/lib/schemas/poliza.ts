import { z } from "zod"

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const coberturaSchema = z.object({
  nombre: z.string().trim().min(1, "Indica el nombre de la cobertura"),
  capital: z.string().trim().optional().transform((v) => v ?? ""),
  franquicia: z.string().trim().optional().transform((v) => v ?? ""),
})

export const polizaSchema = z
  .object({
    cliente_id: z.string().uuid("Selecciona un cliente"),
    compania: z.string().trim().min(1, "La compañía es obligatoria").max(120),
    numero_poliza: z
      .string()
      .trim()
      .min(1, "El número de póliza es obligatorio")
      .max(80),
    tipo: z.enum([
      "auto",
      "hogar",
      "salud",
      "vida",
      "comercio",
      "rc",
      "comunidad",
      "decesos",
      "accidentes",
      "otro",
    ]),
    matricula: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toUpperCase().replace(/\s+/g, " ") : undefined)),
    riesgo_asegurado: textoOpcional,
    fecha_efecto: z
      .string()
      .min(1, "La fecha de efecto es obligatoria")
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida"),
    fecha_vencimiento: z
      .string()
      .min(1, "La fecha de vencimiento es obligatoria")
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida"),
    prima_anual: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "") return undefined
        const n = typeof v === "number" ? v : Number(String(v).replace(",", "."))
        return Number.isNaN(n) ? undefined : n
      })
      .refine((v) => v === undefined || v >= 0, "La prima no puede ser negativa"),
    forma_pago: z
      .enum(["anual", "semestral", "trimestral", "mensual"])
      .default("anual"),
    coberturas: z.array(coberturaSchema).default([]),
    carencias: textoOpcional,
    observaciones: textoOpcional,
    estado: z
      .enum(["vigente", "anulada", "vencida", "en_renovacion"])
      .default("vigente"),
  })
  .refine(
    (data) => data.fecha_vencimiento >= data.fecha_efecto,
    {
      message: "El vencimiento debe ser posterior a la fecha de efecto",
      path: ["fecha_vencimiento"],
    }
  )

export type PolizaFormInput = z.input<typeof polizaSchema>
export type PolizaFormValues = z.output<typeof polizaSchema>
