import { z } from "zod"

// Los datos de la comparativa llegan del navegador (server action), así que se
// validan y acotan igual que cualquier entrada externa.
const texto = (max: number) => z.string().max(max)

export const comparativaDatosSchema = z.object({
  polizas: z
    .array(
      z.object({
        etiqueta: texto(200),
        compania: texto(200),
        tipo: texto(200),
        prima_anual: texto(100),
      })
    )
    .min(2)
    .max(4),
  filas: z
    .array(
      z.object({
        concepto: texto(300),
        valores: z.array(texto(1000)).max(4),
        observacion: texto(1000),
      })
    )
    .max(120),
  diferencias_clave: z.array(texto(1000)).max(30),
  recomendacion: texto(4000),
})

export const guardarComparativaSchema = z.object({
  titulo: z.string().trim().min(1, "Pon un título").max(200),
  cliente_id: z.string().uuid().nullable(),
  datos: comparativaDatosSchema,
})

export type GuardarComparativaInput = z.infer<typeof guardarComparativaSchema>
