import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldAlert,
  CalendarDays,
  BarChart3,
  Sparkles,
  Search,
  UserCog,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Coincidencia de ruta para marcar activo (prefijo). */
  match: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Mi día", icon: LayoutDashboard, match: "/" },
  { href: "/clientes", label: "Clientes", icon: Users, match: "/clientes" },
  { href: "/polizas", label: "Pólizas", icon: FileText, match: "/polizas" },
  { href: "/siniestros", label: "Siniestros", icon: ShieldAlert, match: "/siniestros" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, match: "/agenda" },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, match: "/estadisticas" },
  { href: "/comparador", label: "Comparador IA", icon: Sparkles, match: "/comparador" },
  { href: "/buscar", label: "Buscar", icon: Search, match: "/buscar" },
]

/** Enlace visible solo para el admin de la correduría. */
export const ITEM_EQUIPO: NavItem = {
  href: "/equipo",
  label: "Equipo",
  icon: UserCog,
  match: "/equipo",
}

export function esRutaActiva(pathname: string, match: string): boolean {
  if (match === "/") return pathname === "/"
  return pathname === match || pathname.startsWith(`${match}/`)
}
