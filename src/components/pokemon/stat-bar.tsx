"use client"

import { cn } from "@/lib/utils"
import type { PokemonStat } from "@/types/pokemon"

export interface StatBarProps {
  stat: PokemonStat
  maxValue?: number
  showLabel?: boolean
  showValue?: boolean
  size?: "sm" | "default"
  className?: string
}

export function StatBar({
  stat,
  maxValue = 255,
  showLabel = true,
  showValue = true,
  size = "default",
  className,
}: StatBarProps) {
  const percentage = Math.min((stat.value / maxValue) * 100, 100)

  const barColor = percentage > 75
    ? "#22c55e"
    : percentage > 50
      ? "#eab308"
      : "#ef4444"

  return (
    <div className={cn(
      "flex items-center gap-3",
      size === "sm" ? "text-[10px]" : "text-xs",
      className
    )}>
      {showLabel && (
        <span className={cn(
          "text-muted-foreground truncate",
          size === "sm" ? "w-12" : "w-16"
        )}>
          {stat.name}
        </span>
      )}
      {showValue && (
        <span className={cn(
          "text-right tabular-nums",
          size === "sm" ? "w-6" : "w-8"
        )}>
          {stat.value}
        </span>
      )}
      <div className={cn(
        "flex-1 bg-muted rounded-full overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2"
      )}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  )
}

export interface StatsGridProps {
  stats: PokemonStat[]
  showTotal?: boolean
  size?: "sm" | "default"
  className?: string
}

export function StatsGrid({
  stats,
  showTotal = false,
  size = "default",
  className,
}: StatsGridProps) {
  const total = stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className={cn("space-y-2", className)}>
      {stats.map((stat) => (
        <StatBar key={stat.name} stat={stat} size={size} />
      ))}
      {showTotal && (
        <div className={cn(
          "flex justify-between pt-1 border-t",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}>
          <span className="text-muted-foreground">Total</span>
          <span className="tabular-nums font-medium">{total}</span>
        </div>
      )}
    </div>
  )
}
