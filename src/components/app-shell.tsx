"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid3X3, Heart, MoreHorizontal, Search, Users, Settings, MapPin, Package, Info, GitCompareArrows } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "./navigation/nav-provider"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const navItems = [
  { href: "/", icon: Grid3X3, label: "dex" },
  { href: "/teams", icon: Users, label: "teams" },
  { href: "#search", icon: Search, label: "search", action: true },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "#more", icon: MoreHorizontal, label: "more", action: true },
]

const moreMenuItems = [
  { href: "/comparison", icon: GitCompareArrows, label: "Comparison" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/locations", icon: MapPin, label: "Locations" },
  { href: "/items", icon: Package, label: "Items" },
  { href: "/about", icon: Info, label: "About" },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { toggleSearch, moreOpen, setMoreOpen } = useNav()

  const handleAction = (item: typeof navItems[0]) => {
    if (item.label === "search") {
      toggleSearch()
    } else if (item.label === "more") {
      setMoreOpen(true)
    }
  }

  const isMoreActive = moreMenuItems.some((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )

  const renderNavItem = (item: typeof navItems[0], variant: "mobile" | "desktop") => {
    const isActive =
      !item.action &&
      (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))

    const mobileClasses = "flex flex-col items-center justify-center gap-0.5 px-4 py-2"
    const desktopClasses = "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted"

    if (item.action) {
      // On desktop, don't show the "more" button - we show the items directly
      if (item.label === "more" && variant === "desktop") {
        return null
      }

      return (
        <button
          key={item.label}
          type="button"
          onClick={() => handleAction(item)}
          className={cn(
            variant === "mobile" ? mobileClasses : desktopClasses,
            "text-muted-foreground hover:text-foreground transition-colors",
            item.label === "more" && isMoreActive && "text-foreground"
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

  const renderMoreMenuItem = (item: typeof moreMenuItems[0]) => {
    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="size-5" strokeWidth={1.5} />
        <span className="text-sm">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between border-b bg-background px-6 fixed-bottom-stable">
        <Link href="/" className="text-lg font-medium">
          nationaldex
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => renderNavItem(item, "desktop"))}
          {/* More menu items shown directly on desktop */}
          {moreMenuItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-4" strokeWidth={1.5} />
                <span className="text-xs">{item.label.toLowerCase()}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 pt-safe pb-nav lg:pb-0 lg:pt-14">
        {children}
      </main>

      {/* Mobile/Tablet Bottom Nav - hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-safe lg:hidden fixed-bottom-stable">
        <div className="flex h-12 items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => renderNavItem(item, "mobile"))}
        </div>
      </nav>

      {/* Mobile More Menu Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 py-2">
            {moreMenuItems.map(renderMoreMenuItem)}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
