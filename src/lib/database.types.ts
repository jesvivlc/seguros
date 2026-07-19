// Tipos de la base de datos, escritos a mano para tipar las queries de Supabase.
// Mantener sincronizado con supabase/migrations/*.

import type {
  EstadoCliente,
  TipoPoliza,
  FormaPago,
  EstadoPoliza,
  TipoInteraccion,
  TipoTarea,
  EstadoTarea,
  CategoriaDocumento,
} from "@/lib/constants"

export type Cobertura = {
  nombre: string
  capital: string
  franquicia: string
}

// NOTA: los tipos de fila DEBEN ser `type` (no `interface`). supabase-js exige
// que Row sea asignable a Record<string, unknown>, y solo los `type` alias
// tienen index signature implícita.
type Timestamps = {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type ClienteRow = Timestamps & {
  nombre: string
  apellidos: string
  dni_nie: string | null
  fecha_nacimiento: string | null
  profesion: string | null
  estado_civil: string | null
  telefono: string | null
  telefono_2: string | null
  email: string | null
  direccion: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  notas: string | null
  estado: EstadoCliente
  origen: string | null
}

export type PolizaRow = Timestamps & {
  cliente_id: string
  compania: string
  numero_poliza: string
  tipo: TipoPoliza
  matricula: string | null
  riesgo_asegurado: string | null
  fecha_efecto: string
  fecha_vencimiento: string
  prima_anual: number | null
  forma_pago: FormaPago
  coberturas: Cobertura[]
  carencias: string | null
  observaciones: string | null
  estado: EstadoPoliza
}

export type InteraccionRow = Timestamps & {
  cliente_id: string
  poliza_id: string | null
  tipo: TipoInteraccion
  resumen: string
  detalle: string | null
  fecha: string
}

export type TareaRow = Timestamps & {
  cliente_id: string | null
  poliza_id: string | null
  tipo: TipoTarea
  titulo: string
  descripcion: string | null
  fecha_vencimiento: string
  hora: string | null
  estado: EstadoTarea
  generada_automaticamente: boolean
  completada_at: string | null
}

export type DocumentoRow = Timestamps & {
  cliente_id: string
  poliza_id: string | null
  categoria: CategoriaDocumento
  nombre: string
  storage_path: string
  mime_type: string | null
  tamano_bytes: number | null
}

type TableConfig<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      clientes: TableConfig<ClienteRow>
      polizas: TableConfig<PolizaRow>
      interacciones: TableConfig<InteraccionRow>
      tareas: TableConfig<TareaRow>
      documentos: TableConfig<DocumentoRow>
    }
    Views: Record<string, never>
    Functions: {
      generar_tareas_renovacion: { Args: Record<string, never>; Returns: number }
      generar_tareas_cumpleanos: { Args: Record<string, never>; Returns: number }
      marcar_polizas_vencidas: { Args: Record<string, never>; Returns: number }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Tipos derivados con relaciones para las vistas de detalle.
export type PolizaConCliente = PolizaRow & {
  cliente: Pick<ClienteRow, "id" | "nombre" | "apellidos"> | null
}
export type InteraccionConPoliza = InteraccionRow & {
  poliza: Pick<PolizaRow, "id" | "compania" | "numero_poliza" | "tipo"> | null
}
export type TareaConRelaciones = TareaRow & {
  cliente: Pick<ClienteRow, "id" | "nombre" | "apellidos" | "telefono"> | null
  poliza: Pick<PolizaRow, "id" | "compania" | "tipo" | "numero_poliza"> | null
}
export type DocumentoRowLite = DocumentoRow
