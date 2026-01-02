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

  const renderNavItem = (item: typeof navItems[0], variant: "mobile" | "desktop") => {
    const isActive =
      !item.action &&
      (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))

    const mobileClasses = "flex flex-col items-center justify-center gap-0.5 px-4 py-2"
    const desktopClasses = "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted"

    if (item.action) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={toggleSearch}
          className={cn(
            variant === "mobile" ? mobileClasses : desktopClasses,
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <item.icon className="size-4" strokeWidth={1.5} />
          <span className={variant === "mobile" ? "text-[9px] uppercase tracking-wider" : "text-xs"}>
            {item.label}
          </span>
        </button>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          variant === "mobile" ? mobileClasses : desktopClasses,
          "transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <item.icon className="size-4" strokeWidth={1.5} />
        <span className={variant === "mobile" ? "text-[9px] uppercase tracking-wider" : "text-xs"}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between border-b bg-background px-6">
        <Link href="/" className="text-lg font-medium">
          betterdex
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => renderNavItem(item, "desktop"))}
        </nav>
      </header>

      <main className="flex-1 pt-safe pb-nav lg:pb-0 lg:pt-14">
        {children}
      </main>

      {/* Mobile/Tablet Bottom Nav - hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe lg:hidden">
        <div className="flex h-12 items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => renderNavItem(item, "mobile"))}
        </div>
      </nav>
    </div>
  )
}
