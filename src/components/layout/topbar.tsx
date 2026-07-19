"use client"

import * as React from "react"
import { Menu, Search, LogOut, Umbrella } from "lucide-react"
import { logout } from "@/app/login/actions"
import { SidebarNav } from "./sidebar-nav"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function abrirBuscador() {
  document.dispatchEvent(new CustomEvent("crm:abrir-buscador"))
}

export function Topbar({ email }: { email: string }) {
  const [openSheet, setOpenSheet] = React.useState(false)
  const inicial = email.charAt(0).toUpperCase()

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
      {/* Menú móvil */}
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menú"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
                <Umbrella className="size-4" />
              </span>
              CRM Seguros
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SidebarNav onNavigate={() => setOpenSheet(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Buscador */}
      <button
        type="button"
        onClick={abrirBuscador}
        className="text-muted-foreground bg-muted/50 hover:bg-muted flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border px-3 text-sm transition-colors"
      >
        <Search className="size-4" />
        <span className="truncate">Buscar clientes, pólizas…</span>
        <kbd className="bg-background text-muted-foreground ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 lg:flex-none" />

      {/* Usuario */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="gap-2 px-2"
              aria-label="Menú de usuario"
            />
          }
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{inicial}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[160px] truncate text-sm sm:inline">
            {email}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void logout()
            }}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
