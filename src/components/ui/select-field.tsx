"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface OpcionSelect {
  value: string
  label: string
}

/**
 * Select controlado y sencillo para formularios (react-hook-form).
 * Usa la prop `items` de Base UI para resolver el label del valor seleccionado.
 */
export function SelectSimple({
  value,
  onValueChange,
  options,
  placeholder = "Selecciona…",
  id,
  className,
  disabled,
  ariaInvalid,
}: {
  value: string | null | undefined
  onValueChange: (value: string) => void
  options: OpcionSelect[]
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  ariaInvalid?: boolean
}) {
  return (
    <Select
      items={options}
      value={value ? value : null}
      onValueChange={(v) => onValueChange((v as string) ?? "")}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-invalid={ariaInvalid}
        className={cn("w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
