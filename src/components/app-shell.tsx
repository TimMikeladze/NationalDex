"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid3X3, Heart, MoreHorizontal, Search, Users, Settings, MapPin, Package, Info, GitCompareArrows, CircleHelp, ListPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "./navigation/nav-provider"
import { useIsPWA } from "@/hooks/use-pwa"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { href: "/", icon: Grid3X3, label: "dex" },
  { href: "/teams", icon: Users, label: "teams" },
  { href: "#search", icon: Search, label: "search", action: true },
  { href: "/favorites", icon: Heart, label: "favs" },
  { href: "#more", icon: MoreHorizontal, label: "more", action: true },
]

const moreMenuItems = [
  { href: "/lists", icon: ListPlus, label: "Lists" },
  { href: "/whos-that-pokemon", icon: CircleHelp, label: "Who's That Pokemon?" },
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
  const isPWA = useIsPWA()
  const isPopStateNav = useRef(false)

  // Track back/forward navigation via popstate
  useEffect(() => {
    const handlePopState = () => {
      isPopStateNav.current = true
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Reset scroll position on forward navigation, preserve on back/forward
  useEffect(() => {
    if (isPopStateNav.current) {
      isPopStateNav.current = false
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

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
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 items-center border-b bg-background px-6 fixed-bottom-stable">
        <div className="flex w-full max-w-7xl mx-auto items-center justify-between">
          <Link href="/" className="text-lg font-medium">
            nationaldex
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => renderNavItem(item, "desktop"))}
            {/* Desktop More Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors",
                  isMoreActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MoreHorizontal className="size-4" strokeWidth={1.5} />
                <span className="text-xs">more</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {moreMenuItems.map((item) => {
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isActive && "bg-muted"
                        )}
                      >
                        <item.icon className="size-4" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>

      <main className={cn("flex-1 pb-nav lg:pb-0 lg:pt-14", isPWA && "max-lg:pt-safe")}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
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
