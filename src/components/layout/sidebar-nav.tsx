"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_ITEMS, ITEM_EQUIPO, esRutaActiva } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function SidebarNav({
  onNavigate,
  esAdmin = false,
}: {
  onNavigate?: () => void
  esAdmin?: boolean
}) {
  const pathname = usePathname()
  const items = esAdmin ? [...NAV_ITEMS, ITEM_EQUIPO] : NAV_ITEMS

  return (
    <nav className="grid gap-1 px-3">
      {items.map((item) => {
        const activo = esRutaActiva(pathname, item.match)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
