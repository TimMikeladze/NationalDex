"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useNav } from "@/components/navigation/nav-provider"
import { usePokemonList } from "@/hooks/use-pokemon"
import { getPokemonIdFromUrl, getSpriteUrl } from "@/lib/pokeapi"

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useNav()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const { data } = usePokemonList()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [searchOpen, setSearchOpen])

  const allPokemon =
    data?.pages.flatMap((page) => page.results) ?? []

  const filtered = query
    ? allPokemon.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : allPokemon.slice(0, 10)

  const handleSelect = (pokemonId: number) => {
    setSearchOpen(false)
    setQuery("")
    router.push(`/pokemon/${pokemonId}`)
  }

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        placeholder="Search Pokémon..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No Pokémon found.</CommandEmpty>
        <CommandGroup heading="Pokémon">
          {filtered.slice(0, 20).map((pokemon) => {
            const id = getPokemonIdFromUrl(pokemon.url)
            return (
              <CommandItem
                key={pokemon.name}
                value={pokemon.name}
                onSelect={() => handleSelect(id)}
                className="flex items-center gap-3"
              >
                <img
                  src={getSpriteUrl(id)}
                  alt={pokemon.name}
                  className="size-6 pixelated"
                />
                <span>{pokemon.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  #{id.toString().padStart(3, "0")}
                </span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
