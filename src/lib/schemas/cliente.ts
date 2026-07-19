import { z } from "zod"
import { esDniNieValido, normalizarDniNie } from "@/lib/dni"

const estadoCliente = z.enum(["activo", "inactivo", "potencial"])

// Campo opcional de texto: convierte "" en undefined para no guardar cadenas vacías.
const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellidos: z.string().trim().min(1, "Los apellidos son obligatorios").max(150),
  dni_nie: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizarDniNie(v) : undefined))
    .refine((v) => !v || esDniNieValido(v), {
      message: "DNI/NIE inválido. Revisa el número y la letra de control.",
    }),
  fecha_nacimiento: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Fecha inválida",
    }),
  profesion: textoOpcional,
  estado_civil: textoOpcional,
  telefono: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[+\d\s]{6,20}$/.test(v), {
      message: "Teléfono inválido",
    }),
  telefono_2: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^[+\d\s]{6,20}$/.test(v), {
      message: "Teléfono inválido",
    }),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Email inválido",
    }),
  direccion: textoOpcional,
  codigo_postal: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => !v || /^\d{5}$/.test(v), {
      message: "El código postal debe tener 5 dígitos",
    }),
  poblacion: textoOpcional,
  provincia: textoOpcional,
  notas: textoOpcional,
  estado: estadoCliente.default("activo"),
  origen: textoOpcional,
})

// Entrada del formulario (antes de transformar): todo string.
export type ClienteFormInput = z.input<typeof clienteSchema>
// Salida validada (para insertar/actualizar en la BD).
export type ClienteFormValues = z.output<typeof clienteSchema>
