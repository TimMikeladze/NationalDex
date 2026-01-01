"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid3X3, Heart, Settings, Search, Swords, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "./navigation/nav-provider"

const navItems = [
  { href: "/", icon: Grid3X3, label: "dex" },
  { href: "/teams", icon: Users, label: "teams" },
  { href: "#search", icon: Search, label: "search", action: true },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "/settings", icon: Settings, label: "config" },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { toggleSearch } = useNav()

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-nav">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe">
        <div className="flex h-12 items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive =
              !item.action &&
              (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))

            if (item.action) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={toggleSearch}
                  className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <item.icon className="size-4" strokeWidth={1.5} />
                  <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-4" strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
