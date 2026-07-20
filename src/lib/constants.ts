// Enumeraciones de dominio + etiquetas en español + opciones para selects.
// Los valores string coinciden EXACTAMENTE con los enums de Postgres (ver migraciones).

export type EstadoCliente = "activo" | "inactivo" | "potencial"
export type TipoPoliza =
  | "auto"
  | "hogar"
  | "salud"
  | "vida"
  | "comercio"
  | "rc"
  | "comunidad"
  | "decesos"
  | "accidentes"
  | "otro"
export type FormaPago = "anual" | "semestral" | "trimestral" | "mensual"
export type EstadoPoliza = "vigente" | "anulada" | "vencida" | "en_renovacion"
export type TipoInteraccion =
  | "llamada"
  | "whatsapp"
  | "email"
  | "reunion"
  | "presupuesto"
  | "renovacion"
  | "nota"
  | "documento"
  | "cambio"
export type TipoTarea =
  | "llamar"
  | "enviar_comparativa"
  | "recordar_pago"
  | "solicitar_documentacion"
  | "revisar_renovacion"
  | "reunion"
  | "cumpleanos"
  | "otro"
export type EstadoTarea = "pendiente" | "completada" | "pospuesta"
export type CategoriaDocumento =
  | "poliza"
  | "anulacion"
  | "personal"
  | "siniestro"
  | "presupuesto"
  | "comision"
  | "contratacion"
  | "informe"
  | "otro"

// Multi-tenancy
export type Visibilidad = "compartida" | "por_agente"
export type RolUsuario = "admin" | "agente"

// Siniestros
export type TipoSiniestro =
  | "danos"
  | "robo"
  | "incendio"
  | "agua"
  | "rc"
  | "lesiones"
  | "otro"
export type EstadoSiniestro =
  | "abierto"
  | "en_tramite"
  | "pericial"
  | "resuelto"
  | "rechazado"
  | "cerrado"

type LabelMap<T extends string> = Record<T, string>

export const ESTADO_CLIENTE_LABEL: LabelMap<EstadoCliente> = {
  activo: "Activo",
  inactivo: "Inactivo",
  potencial: "Potencial",
}

export const TIPO_POLIZA_LABEL: LabelMap<TipoPoliza> = {
  auto: "Auto",
  hogar: "Hogar",
  salud: "Salud",
  vida: "Vida",
  comercio: "Comercio",
  rc: "Responsabilidad Civil",
  comunidad: "Comunidad",
  decesos: "Decesos",
  accidentes: "Accidentes",
  otro: "Otro",
}

export const FORMA_PAGO_LABEL: LabelMap<FormaPago> = {
  anual: "Anual",
  semestral: "Semestral",
  trimestral: "Trimestral",
  mensual: "Mensual",
}

export const ESTADO_POLIZA_LABEL: LabelMap<EstadoPoliza> = {
  vigente: "Vigente",
  anulada: "Anulada",
  vencida: "Vencida",
  en_renovacion: "En renovación",
}

export const TIPO_INTERACCION_LABEL: LabelMap<TipoInteraccion> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
  reunion: "Reunión",
  presupuesto: "Presupuesto",
  renovacion: "Renovación",
  nota: "Nota",
  documento: "Documento",
  cambio: "Cambio",
}

export const TIPO_TAREA_LABEL: LabelMap<TipoTarea> = {
  llamar: "Llamar",
  enviar_comparativa: "Enviar comparativa",
  recordar_pago: "Recordar pago",
  solicitar_documentacion: "Solicitar documentación",
  revisar_renovacion: "Revisar renovación",
  reunion: "Reunión",
  cumpleanos: "Cumpleaños",
  otro: "Otro",
}

export const ESTADO_TAREA_LABEL: LabelMap<EstadoTarea> = {
  pendiente: "Pendiente",
  completada: "Completada",
  pospuesta: "Pospuesta",
}

export const CATEGORIA_DOCUMENTO_LABEL: LabelMap<CategoriaDocumento> = {
  poliza: "Póliza",
  anulacion: "Anulación",
  personal: "Personal",
  siniestro: "Siniestro",
  presupuesto: "Presupuesto",
  comision: "Comisión",
  contratacion: "Contratación",
  informe: "Informe",
  otro: "Otro",
}

export const ESTADO_CIVIL_OPCIONES = [
  "Soltero/a",
  "Casado/a",
  "Pareja de hecho",
  "Divorciado/a",
  "Viudo/a",
  "Separado/a",
] as const

// Helper para construir opciones de <Select> a partir de un LabelMap.
export function toOptions<T extends string>(
  map: LabelMap<T>
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }))
}

export const ROL_LABEL: LabelMap<RolUsuario> = {
  admin: "Administrador",
  agente: "Agente",
}
export const VISIBILIDAD_LABEL: LabelMap<Visibilidad> = {
  compartida: "Compartida — todos ven toda la cartera",
  por_agente: "Por agente — cada uno ve solo lo suyo",
}

export const TIPO_SINIESTRO_LABEL: LabelMap<TipoSiniestro> = {
  danos: "Daños materiales",
  robo: "Robo",
  incendio: "Incendio",
  agua: "Daños por agua",
  rc: "Responsabilidad civil",
  lesiones: "Lesiones",
  otro: "Otro",
}
export const ESTADO_SINIESTRO_LABEL: LabelMap<EstadoSiniestro> = {
  abierto: "Abierto",
  en_tramite: "En trámite",
  pericial: "Pericial",
  resuelto: "Resuelto",
  rechazado: "Rechazado",
  cerrado: "Cerrado",
}

export const ESTADO_CLIENTE_OPTIONS = toOptions(ESTADO_CLIENTE_LABEL)
export const ROL_OPTIONS = toOptions(ROL_LABEL)
export const VISIBILIDAD_OPTIONS = toOptions(VISIBILIDAD_LABEL)
export const TIPO_SINIESTRO_OPTIONS = toOptions(TIPO_SINIESTRO_LABEL)
export const ESTADO_SINIESTRO_OPTIONS = toOptions(ESTADO_SINIESTRO_LABEL)
export const TIPO_POLIZA_OPTIONS = toOptions(TIPO_POLIZA_LABEL)
export const FORMA_PAGO_OPTIONS = toOptions(FORMA_PAGO_LABEL)
export const ESTADO_POLIZA_OPTIONS = toOptions(ESTADO_POLIZA_LABEL)
export const TIPO_INTERACCION_OPTIONS = toOptions(TIPO_INTERACCION_LABEL)
export const TIPO_TAREA_OPTIONS = toOptions(TIPO_TAREA_LABEL)
export const CATEGORIA_DOCUMENTO_OPTIONS = toOptions(CATEGORIA_DOCUMENTO_LABEL)
