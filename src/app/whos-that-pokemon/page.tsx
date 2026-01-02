"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { usePokemon } from "@/hooks/use-pokemon"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, SkipForward, Trophy, Flame } from "lucide-react"
import Link from "next/link"

const MAX_POKEMON_ID = 1025 // Main series Pokemon

function getRandomPokemonId(): number {
  return Math.floor(Math.random() * MAX_POKEMON_ID) + 1
}

function normalizeGuess(guess: string): string {
  return guess
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "") // Remove special characters
}

function normalizePokemonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove special characters like spaces, hyphens
}

export default function WhosThatPokemonPage() {
  const [pokemonId, setPokemonId] = useState<number>(() => getRandomPokemonId())
  const [guess, setGuess] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: pokemon, isLoading } = usePokemon(pokemonId)

  // Load best streak from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("whos-that-pokemon-best-streak")
    if (saved) {
      setBestStreak(Number.parseInt(saved, 10))
    }
  }, [])

  // Save best streak to localStorage
  useEffect(() => {
    if (streak > bestStreak) {
      setBestStreak(streak)
      localStorage.setItem("whos-that-pokemon-best-streak", streak.toString())
    }
  }, [streak, bestStreak])

  const checkGuess = useCallback(() => {
    if (!pokemon || revealed) return

    const normalizedGuess = normalizeGuess(guess)
    const normalizedName = normalizePokemonName(pokemon.name)

    if (normalizedGuess === normalizedName) {
      setRevealed(true)
      setIsCorrect(true)
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
    }
  }, [guess, pokemon, revealed])

  const handleGiveUp = useCallback(() => {
    setRevealed(true)
    setIsCorrect(false)
    setStreak(0)
  }, [])

  const handleNext = useCallback(() => {
    setPokemonId(getRandomPokemonId())
    setGuess("")
    setRevealed(false)
    setIsCorrect(false)
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (revealed) {
          handleNext()
        } else {
          checkGuess()
        }
      }
    },
    [revealed, handleNext, checkGuess]
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Who&apos;s That Pokemon?</h1>

      {/* Score Display */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="size-4 text-yellow-500" />
          <span>Score: {score}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Flame className="size-4 text-orange-500" />
          <span>Streak: {streak}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Best: {bestStreak}</span>
        </div>
      </div>

      {/* Pokemon Silhouette */}
      <div className="relative flex justify-center items-center mb-6 min-h-[200px] bg-muted/30 rounded-lg">
        {isLoading ? (
          <div className="size-48 animate-pulse bg-muted rounded-lg" />
        ) : pokemon ? (
          <div className="relative">
            <img
              src={pokemon.sprite}
              alt={revealed ? pokemon.name : "Mystery Pokemon"}
              className={cn(
                "size-48 md:size-64 transition-all duration-500 pixelated",
                !revealed && "brightness-0"
              )}
            />
            {revealed && (
              <div
                className={cn(
                  "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium",
                  isCorrect
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-red-500/20 text-red-600 dark:text-red-400"
                )}
              >
                {isCorrect ? "Correct!" : "Better luck next time!"}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Pokemon Name (revealed) */}
      {revealed && pokemon && (
        <div className="text-center mb-6">
          <Link
            href={`/pokemon/${pokemon.id}`}
            className="text-xl font-bold hover:text-primary transition-colors"
          >
            {pokemon.name}
          </Link>
          <p className="text-sm text-muted-foreground">#{pokemon.id.toString().padStart(4, "0")}</p>
        </div>
      )}

      {/* Input and Actions */}
      <div className="space-y-4">
        {!revealed ? (
          <>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter Pokemon name..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-center text-lg"
            />
            <div className="flex gap-2">
              <Button onClick={checkGuess} className="flex-1" disabled={!guess.trim()}>
                <Check className="size-4 mr-2" />
                Guess
              </Button>
              <Button onClick={handleGiveUp} variant="outline" className="flex-1">
                <X className="size-4 mr-2" />
                Give Up
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={handleNext} className="w-full" size="lg">
            <SkipForward className="size-4 mr-2" />
            Next Pokemon
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Guess the Pokemon from its silhouette!</p>
        <p>Press Enter to submit your guess or move to the next Pokemon.</p>
      </div>
    </div>
  )
}
