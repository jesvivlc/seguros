import { NextResponse } from "next/server"
import { requireCorreduria } from "@/lib/auth"
import { compararPolizas, type DocInput } from "@/lib/comparador"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const MAX_MB = 15
const MAX_POLIZAS = 4

export async function POST(request: Request) {
  await requireCorreduria() // exige sesión con correduría

  const form = await request.formData()
  const files = form.getAll("pdfs").filter((f): f is File => f instanceof File)

  if (files.length < 2) {
    return NextResponse.json({ error: "Sube al menos 2 pólizas en PDF." }, { status: 400 })
  }
  if (files.length > MAX_POLIZAS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_POLIZAS} pólizas por comparación.` },
      { status: 400 }
    )
  }
  for (const f of files) {
    if (f.type !== "application/pdf") {
      return NextResponse.json({ error: `«${f.name}» no es un PDF.` }, { status: 400 })
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `«${f.name}» supera los ${MAX_MB} MB.` },
        { status: 400 }
      )
    }
  }

  const docs: DocInput[] = await Promise.all(
    files.map(async (f) => ({
      nombre: f.name,
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
    }))
  )

  try {
    const comparativa = await compararPolizas(docs)
    return NextResponse.json({ ok: true, comparativa })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json(
      { error: `No se pudo generar la comparativa. ${msg}` },
      { status: 500 }
    )
  }
}
