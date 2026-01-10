"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { NewsItem, NewsCategory } from "@/types/news"
import { GENERATION_LIMITS } from "@/types/news"

interface NewsCardProps {
  news: NewsItem
}

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  "game-release": "Game Release",
  "regional-dex": "Regional Dex",
  event: "Event",
  update: "Update",
  feature: "Feature",
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  "game-release": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "regional-dex": "bg-green-500/10 text-green-500 border-green-500/20",
  event: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  update: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  feature: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getGenerationLabel(generationId: string): string {
  const gen = GENERATION_LIMITS.find((g) => g.generation === generationId)
  return gen?.name ?? generationId
}

export function NewsCard({ news }: NewsCardProps) {
  return (
    <Card className="rounded-lg hover:border-foreground/20 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{news.title}</CardTitle>
          <Badge className={`${CATEGORY_COLORS[news.category]} shrink-0`}>
            {CATEGORY_LABELS[news.category]}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {formatDate(news.publishedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-0">
        <p className="text-sm text-muted-foreground">{news.summary}</p>
      </CardContent>
      <CardFooter className="pt-3 flex-wrap gap-2">
        {/* Generation tags */}
        {news.generations && news.generations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {news.generations.map((gen) => (
              <Badge
                key={gen}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {getGenerationLabel(gen)}
              </Badge>
            ))}
          </div>
        )}
        {/* Pokemon limit info */}
        {news.pokemonLimit && (
          <span className="text-xs text-muted-foreground">
            Up to #{news.pokemonLimit}
          </span>
        )}
        {news.pokemonRange && (
          <span className="text-xs text-muted-foreground">
            #{news.pokemonRange[0]}-{news.pokemonRange[1]}
          </span>
        )}
      </CardFooter>
    </Card>
  )
}

export function NewsCardSkeleton() {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="py-0">
        <div className="space-y-1">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <div className="flex gap-1">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      </CardFooter>
    </Card>
  )
}
