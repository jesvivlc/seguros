import { Lightbulb } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ComparativaDatos } from "@/lib/database.types"

/** Presentación de una comparativa (pantalla e impresión). Sin estado ni hooks. */
export function ComparativaView({ res }: { res: ComparativaDatos }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Cobertura</TableHead>
              {res.polizas.map((p, i) => (
                <TableHead key={i}>
                  <div className="font-medium">{p.compania}</div>
                  <div className="text-muted-foreground text-xs font-normal">
                    {p.tipo} · {p.prima_anual}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {res.filas.map((fila, i) => (
              <TableRow key={i} className="break-inside-avoid">
                <TableCell className="align-top font-medium">
                  {fila.concepto}
                  {fila.observacion && (
                    <div className="text-muted-foreground text-xs font-normal">
                      {fila.observacion}
                    </div>
                  )}
                </TableCell>
                {fila.valores.map((v, j) => (
                  <TableCell key={j} className="align-top">
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {res.diferencias_clave.length > 0 && (
        <Card className="break-inside-avoid">
          <CardContent className="grid gap-2 pt-6">
            <h3 className="text-sm font-medium">Diferencias clave</h3>
            <ul className="text-muted-foreground grid list-disc gap-1 pl-5 text-sm">
              {res.diferencias_clave.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {res.recomendacion && (
        <Card className="break-inside-avoid">
          <CardContent className="flex gap-3 pt-6">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="text-sm font-medium">Recomendación (orientativa)</h3>
              <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
                {res.recomendacion}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        Generado por IA a partir de los PDF. Revisa siempre el condicionado
        original: puede haber matices que la extracción automática no capte.
      </p>
    </div>
  )
}
