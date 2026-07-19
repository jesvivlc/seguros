"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ClienteOpcion {
  id: string
  label: string
  sub?: string
}

export function ClienteCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Selecciona un cliente…",
  disabled,
  ariaInvalid,
}: {
  value: string | null | undefined
  onValueChange: (id: string) => void
  options: ClienteOpcion[]
  placeholder?: string
  disabled?: boolean
  ariaInvalid?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const seleccionado = options.find((o) => o.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn(!seleccionado && "text-muted-foreground")}>
          {seleccionado ? seleccionado.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente…" />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.label} ${o.sub ?? ""}`}
                  onSelect={() => {
                    onValueChange(o.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === o.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{o.label}</span>
                  {o.sub && (
                    <span className="text-muted-foreground text-xs">{o.sub}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
