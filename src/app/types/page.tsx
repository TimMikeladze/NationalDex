"use client"

import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { useAllTypes } from "@/hooks/use-pokemon"
import { TYPE_COLORS } from "@/types/pokemon"
import type { TypeDetail, PokemonType } from "@/types/pokemon"

export default function TypesPage() {
  const { data: types, isLoading } = useAllTypes()

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto space-y-6">
        <section className="space-y-2">
          <h1 className="text-xl font-medium">Types</h1>
          <p className="text-sm text-muted-foreground">
            All 18 Pokemon types with their damage relations
          </p>
        </section>

        {isLoading ? (
          <TypesGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {types?.map((type) => (
              <TypeCard key={type.id} type={type} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypeCard({ type }: { type: TypeDetail }) {
  const color = TYPE_COLORS[type.name]
  const weakCount = type.damageRelations.doubleDamageFrom.length
  const resistCount = type.damageRelations.halfDamageFrom.length + type.damageRelations.noDamageFrom.length

  return (
    <Link
      href={`/types/${type.name}`}
      className="group block p-4 rounded-lg border hover:border-transparent transition-all"
      style={{
        backgroundColor: `${color}10`,
        // @ts-expect-error - CSS custom property
        "--hover-bg": `${color}25`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}25`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}10`
      }}
    >
      <div className="space-y-3">
        {/* Type name badge */}
        <span
          className="inline-block text-[11px] px-2 py-1 uppercase tracking-wider rounded font-medium"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {type.name}
        </span>

        {/* Quick effectiveness summary */}
        <div className="space-y-1.5">
          <EffectivenessRow
            label="Weak to"
            types={type.damageRelations.doubleDamageFrom}
            count={weakCount}
          />
          <EffectivenessRow
            label="Resists"
            types={[...type.damageRelations.halfDamageFrom, ...type.damageRelations.noDamageFrom]}
            count={resistCount}
          />
        </div>
      </div>
    </Link>
  )
}

function EffectivenessRow({
  label,
  types,
  count,
}: {
  label: string
  types: PokemonType[]
  count: number
}) {
  const displayTypes = types.slice(0, 3)
  const remaining = count - displayTypes.length

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">
        {label}
      </span>
      <div className="flex gap-0.5 flex-wrap">
        {displayTypes.map((t) => (
          <span
            key={t}
            className="size-4 rounded-sm"
            style={{ backgroundColor: TYPE_COLORS[t] }}
            title={t}
          />
        ))}
        {remaining > 0 && (
          <span className="text-[9px] text-muted-foreground">+{remaining}</span>
        )}
        {count === 0 && (
          <span className="text-[9px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  )
}

function TypesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 18 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  )
}
