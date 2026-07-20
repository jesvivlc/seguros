import "server-only"
import Anthropic from "@anthropic-ai/sdk"

export interface DocInput {
  nombre: string
  base64: string
}

export interface PolizaResumen {
  etiqueta: string
  compania: string
  tipo: string
  prima_anual: string
}
export interface FilaComparativa {
  concepto: string
  /** Un valor por póliza, en el mismo orden que `polizas`. */
  valores: string[]
  observacion: string
}
export interface Comparativa {
  polizas: PolizaResumen[]
  filas: FilaComparativa[]
  diferencias_clave: string[]
  recomendacion: string
}

const SYSTEM = `Eres un asesor experto en seguros en España. Analizas condicionados de
pólizas (en PDF) y produces comparativas claras, objetivas y en español. No inventas
datos: si un dato no aparece en el documento, escribe "No consta". No das consejos
legales ni garantías; la recomendación es orientativa y neutral.`

function prompt(n: number): string {
  return `Compara las ${n} pólizas de seguro adjuntas (cada PDF es una póliza, en el
orden en que aparecen). Extrae para cada una: compañía, tipo de seguro y prima anual.
Luego elabora una tabla de coberturas: cada fila es un concepto de cobertura (capital
asegurado, franquicia, límites, garantías, exclusiones relevantes, etc.) con su valor
en cada póliza (mismo orden). Añade las diferencias clave y una recomendación breve y
neutral sobre cuál conviene según qué prioridad.

Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes o después, sin \`\`\`),
con esta forma exacta:
{
  "polizas": [{ "etiqueta": string, "compania": string, "tipo": string, "prima_anual": string }],
  "filas": [{ "concepto": string, "valores": string[], "observacion": string }],
  "diferencias_clave": string[],
  "recomendacion": string
}
Cada "valores" debe tener exactamente ${n} elementos, uno por póliza y en su orden.
Usa "No consta" cuando un dato no aparezca. Todo en español.`
}

/** Extrae el objeto JSON de la respuesta, tolerando texto o fences alrededor. */
function extraerJSON(texto: string): Comparativa {
  const ini = texto.indexOf("{")
  const fin = texto.lastIndexOf("}")
  if (ini === -1 || fin === -1) throw new Error("La IA no devolvió un JSON válido.")
  return JSON.parse(texto.slice(ini, fin + 1)) as Comparativa
}

export async function compararPolizas(docs: DocInput[]): Promise<Comparativa> {
  const client = new Anthropic()

  const content: Anthropic.ContentBlockParam[] = [
    ...docs.map((d) => ({
      type: "document" as const,
      source: {
        type: "base64" as const,
        media_type: "application/pdf" as const,
        data: d.base64,
      },
    })),
    { type: "text" as const, text: prompt(docs.length) },
  ]

  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content }],
  })

  const texto = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")

  const comparativa = extraerJSON(texto)
  // Normaliza: asegura que cada fila tenga un valor por póliza.
  const n = comparativa.polizas.length
  for (const fila of comparativa.filas) {
    while (fila.valores.length < n) fila.valores.push("No consta")
    fila.valores = fila.valores.slice(0, n)
  }
  return comparativa
}
