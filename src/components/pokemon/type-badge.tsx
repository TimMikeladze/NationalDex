"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { TYPE_COLORS, TYPE_TEXT_COLORS } from "@/types/pokemon"
import type { PokemonType } from "@/types/pokemon"

export interface TypeBadgeProps {
  type: PokemonType
  multiplier?: number
  size?: "sm" | "default" | "lg"
  linkable?: boolean
  className?: string
}

export function TypeBadge({
  type,
  multiplier,
  size = "default",
  linkable = false,
  className,
}: TypeBadgeProps) {
  const { resolvedTheme } = useTheme()
  const bgColor = TYPE_COLORS[type]
  const textColor = resolvedTheme === "dark" ? TYPE_COLORS[type] : TYPE_TEXT_COLORS[type]

  const multiplierLabel = multiplier !== undefined
    ? multiplier === 0
      ? "×0"
      : `×${multiplier}`
    : null

  const badgeClasses = cn(
    "inline-flex items-center gap-1 uppercase tracking-wider rounded font-medium",
    size === "sm" && "text-[10px] px-1.5 py-0.5",
    size === "default" && "text-xs px-2 py-0.5",
    size === "lg" && "text-sm px-2.5 py-1",
    linkable && "hover:opacity-80 transition-opacity",
    className
  )

  const badgeStyle = { backgroundColor: `${bgColor}20`, color: textColor }

  const content = (
    <>
      {type}
      {multiplierLabel && (
        <span className="opacity-75">{multiplierLabel}</span>
      )}
    </>
  )

  if (linkable) {
    return (
      <Link href={`/types/${type}`} className={badgeClasses} style={badgeStyle}>
        {content}
      </Link>
    )
  }

  return (
    <span className={badgeClasses} style={badgeStyle}>
      {content}
    </span>
  )
}
