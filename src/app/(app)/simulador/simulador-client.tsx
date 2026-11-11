"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectSimple } from "@/components/ui/select-field"
import { ImprimirButton } from "@/components/imprimir-button"
import { formatEuros } from "@/lib/format"
import { simular } from "@/lib/simulador"

export interface PolizaOpcion {
  id: string
  nombre: string
  prima: number
  label: string
}

type Alt = { nombre: string; prima: string }

/** "1.234,56" / "1234.56" / "1234,56" → número (NaN si no es válido). */
function num(v: string): number {
  const s = v.trim().replace(/\s/g, "")
  if (!s) return NaN
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s
  return Number(normal)
}

const ANIOS = [1, 3, 5].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "año" : "años"}` }))

export function SimuladorClient({ polizas }: { polizas: PolizaOpcion[] }) {
  const [polizaId, setPolizaId] = React.useState("")
  const [nombreActual, setNombreActual] = React.useState("Póliza actual")
  const [primaActual, setPrimaActual] = React.useState("")
  const [alts, setAlts] = React.useState<Alt[]>([{ nombre: "Alternativa 1", prima: "" }])
  const [anios, setAnios] = React.useState("3")
  const [subida, setSubida] = React.useState("0")

  function elegirPoliza(id: string) {
    setPolizaId(id)
    const p = polizas.find((x) => x.id === id)
    if (p) {
      setNombreActual(p.nombre)
      setPrimaActual(String(p.prima).replace(".", ","))
    }
  }
  function setAlt(i: number, parche: Partial<Alt>) {
    setAlts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...parche } : a)))
  }

  const pActual = num(primaActual)
  const sub = num(subida)
  const subOk = Number.isFinite(sub) && sub >= -50 && sub <= 100
  const validas = alts
    .map((a) => ({ nombre: a.nombre.trim() || "Alternativa", prima: num(a.prima) }))
    .filter((a) => Number.isFinite(a.prima) && a.prima >= 0)

  const res =
    Number.isFinite(pActual) && pActual >= 0 && subOk && validas.length > 0
      ? simular({ nombre: nombreActual, prima: pActual }, validas, Number(anios), sub)
      : null

  return (
    <div className="grid gap-4">
      <Card className="print:hidden">
        <CardContent className="grid gap-4 pt-6">
          <div className="grid gap-2">
            <Label>Partir de una póliza existente (opcional)</Label>
            <SelectSimple
              value={polizaId}
              onValueChange={elegirPoliza}
              options={polizas.map((p) => ({ value: p.id, label: p.label }))}
              placeholder="Selecciona una póliza para rellenar la prima actual…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombre-actual">Póliza actual</Label>
              <Input
                id="nombre-actual"
                value={nombreActual}
                maxLength={80}
                onChange={(e) => setNombreActual(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prima-actual">Prima anual actual (€)</Label>
              <Input
                id="prima-actual"
                inputMode="decimal"
                value={primaActual}
                onChange={(e) => setPrimaActual(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Alternativas</Label>
            {alts.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_9rem_auto] gap-2">
                <Input
                  aria-label={`Nombre de la alternativa ${i + 1}`}
                  value={a.nombre}
                  maxLength={80}
                  onChange={(e) => setAlt(i, { nombre: e.target.value })}
                />
                <Input
                  aria-label={`Prima anual de la alternativa ${i + 1}`}
                  inputMode="decimal"
                  value={a.prima}
                  onChange={(e) => setAlt(i, { prima: e.target.value })}
                  placeholder="Prima €"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar alternativa"
                  disabled={alts.length === 1}
                  onClick={() => setAlts((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {alts.length < 4 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAlts((prev) => [...prev, { nombre: `Alternativa ${prev.length + 1}`, prima: "" }])
                  }
                >
                  <Plus className="size-4" />
                  Añadir alternativa
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Horizonte</Label>
              <SelectSimple value={anios} onValueChange={setAnios} options={ANIOS} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subida">Subida anual estimada de la prima (%)</Label>
              <Input
                id="subida"
                inputMode="decimal"
                value={subida}
                onChange={(e) => setSubida(e.target.value)}
                aria-invalid={!subOk}
              />
              {!subOk && (
                <p className="text-destructive text-xs">Introduce un valor entre −50 y 100.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {res ? (
        <Card>
          <CardContent className="grid gap-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">
                Resultado a {res.anios} {res.anios === 1 ? "año" : "años"}
                {res.subidaPct !== 0 && ` con subida anual del ${res.subidaPct} %`}
              </h2>
              <div className="print:hidden">
                <ImprimirButton label="Imprimir / PDF" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="py-2 pr-3 font-medium">Opción</th>
                    <th className="py-2 pr-3 text-right font-medium">Prima anual</th>
                    <th className="py-2 pr-3 text-right font-medium">Dif. anual</th>
                    <th className="py-2 pr-3 text-right font-medium">Dif. %</th>
                    <th className="py-2 text-right font-medium">Coste acumulado</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-b">
                    <td className="py-2 pr-3 font-medium">{res.actual.nombre}</td>
                    <td className="py-2 pr-3 text-right">{formatEuros(res.actual.prima)}</td>
                    <td className="text-muted-foreground py-2 pr-3 text-right">—</td>
                    <td className="text-muted-foreground py-2 pr-3 text-right">—</td>
                    <td className="py-2 text-right" title={res.actual.acumuladoFormula}>
                      {formatEuros(res.actual.acumulado)}
                    </td>
                  </tr>
                  {res.opciones.map((o, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 pr-3 font-medium">{o.nombre}</td>
                      <td className="py-2 pr-3 text-right">{formatEuros(o.prima)}</td>
                      <td
                        className={`py-2 pr-3 text-right ${o.difAnual < 0 ? "text-emerald-600" : o.difAnual > 0 ? "text-red-600" : ""}`}
                        title={o.difAnualFormula}
                      >
                        {o.difAnual > 0 ? "+" : ""}
                        {formatEuros(o.difAnual)}
                      </td>
                      <td className="py-2 pr-3 text-right" title={o.difPctFormula}>
                        {o.difPct === null ? "—" : `${o.difPct > 0 ? "+" : ""}${o.difPct} %`}
                      </td>
                      <td className="py-2 text-right" title={o.acumuladoFormula}>
                        {formatEuros(o.acumulado)}
                        <span
                          className={`block text-xs ${o.difAcumulada < 0 ? "text-emerald-600" : o.difAcumulada > 0 ? "text-red-600" : "text-muted-foreground"}`}
                        >
                          {o.difAcumulada > 0 ? "+" : ""}
                          {formatEuros(o.difAcumulada)} vs. actual
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-muted-foreground grid gap-1 text-xs">
              <p>Cómo se calcula cada cifra:</p>
              <ul className="list-disc pl-5">
                <li>Dif. anual: {res.opciones[0].difAnualFormula}.</li>
                <li>Dif. %: {res.opciones[0].difPctFormula}.</li>
                <li>Coste acumulado: {res.opciones[0].acumuladoFormula}.</li>
              </ul>
              <p>
                Solo compara las primas que has introducido: no tiene en cuenta
                diferencias de coberturas, franquicias ni condiciones. Para eso, usa el
                comparador de pólizas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">
          Introduce la prima actual y al menos una alternativa para ver la comparación.
        </p>
      )}
    </div>
  )
}
