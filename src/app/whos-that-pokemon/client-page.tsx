"use client";

import {
  Check,
  Flame,
  HelpCircle,
  Lightbulb,
  Settings2,
  SkipForward,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationPreference } from "@/hooks/use-generation-preference";
import { usePokemon } from "@/hooks/use-pokemon";
import { GEN_RANGES, getSpeciesForView, toID } from "@/lib/pkmn";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "normal" | "hard";
type Generation = "all" | string;

const DIFFICULTY_INFO: Record<
  Difficulty,
  { label: string; description: string }
> = {
  easy: { label: "Easy", description: "Type hint shown" },
  normal: { label: "Normal", description: "Silhouette only" },
  hard: { label: "Hard", description: "Zoomed in, no hints" },
};

/**
 * Picks a Pokemon from the chosen region, limited to the ones that existed in
 * the generation being viewed so the quiz never asks about a Pokemon the
 * player's games never had.
 */
function getRandomPokemonIdForGen(
  gen: Generation,
  viewGeneration: number | null,
): number {
  const genRange = gen === "all" ? null : GEN_RANGES.find((g) => g.id === gen);

  const candidates = getSpeciesForView(viewGeneration)
    .map((s) => s.num)
    .filter((num) => !genRange || (num >= genRange.min && num <= genRange.max));

  if (candidates.length === 0) {
    // Nothing in this region existed in that generation; fall back to its dex.
    const range = genRange ? genRange.max - genRange.min + 1 : 1025;
    const min = genRange ? genRange.min : 1;
    return Math.floor(Math.random() * range) + min;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function normalizeGuess(guess: string): string {
  return guess
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function normalizePokemonName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function WhosThatPokemonClient() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [generation, setGeneration] = useState<Generation>("all");
  const { preferredGeneration } = useGenerationPreference();
  const [pokemonId, setPokemonId] = useState<number>(() =>
    getRandomPokemonIdForGen("all", null),
  );
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [honorSystem, setHonorSystem] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showFirstLetter, setShowFirstLetter] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pokemon, isLoading } = usePokemon(
    pokemonId,
    preferredGeneration,
  );

  // Load best streak from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("whos-that-pokemon-best-streak");
    if (saved) {
      setBestStreak(Number.parseInt(saved, 10));
    }
  }, []);

  // Save best streak to localStorage
  useEffect(() => {
    if (streak > bestStreak) {
      setBestStreak(streak);
      localStorage.setItem("whos-that-pokemon-best-streak", streak.toString());
    }
  }, [streak, bestStreak]);

  const checkGuess = useCallback(() => {
    if (!pokemon || revealed) return;

    const normalizedGuess = normalizeGuess(guess);
    const normalizedName = normalizePokemonName(pokemon.name);

    if (normalizedGuess === normalizedName) {
      setRevealed(true);
      setIsCorrect(true);
      // Adjust points based on difficulty and hints
      const basePoints =
        difficulty === "hard" ? 3 : difficulty === "easy" ? 1 : 2;
      const hintPenalty = hintsUsed > 0 ? 1 : 0;
      setScore((s) => s + Math.max(1, basePoints - hintPenalty));
      setStreak((s) => s + 1);
    }
  }, [guess, pokemon, revealed, difficulty, hintsUsed]);

  const handleRevealAnswer = useCallback(() => {
    setRevealed(true);
    setHonorSystem(true);
  }, []);

  const handleHonorCorrect = useCallback(() => {
    setIsCorrect(true);
    setHonorSystem(false);
    const basePoints =
      difficulty === "hard" ? 3 : difficulty === "easy" ? 1 : 2;
    setScore((s) => s + basePoints);
    setStreak((s) => s + 1);
  }, [difficulty]);

  const handleHonorIncorrect = useCallback(() => {
    setIsCorrect(false);
    setHonorSystem(false);
    setStreak(0);
  }, []);

  const handleNext = useCallback(() => {
    setPokemonId(getRandomPokemonIdForGen(generation, preferredGeneration));
    setGuess("");
    setRevealed(false);
    setIsCorrect(false);
    setHonorSystem(false);
    setShowFirstLetter(false);
    setHintsUsed(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [generation, preferredGeneration]);

  const handleUseHint = useCallback(() => {
    if (!showFirstLetter && pokemon) {
      setShowFirstLetter(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showFirstLetter, pokemon]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (revealed) {
          handleNext();
        } else {
          checkGuess();
        }
      }
    },
    [revealed, handleNext, checkGuess],
  );

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  }, []);

  const handleGenerationChange = useCallback(
    (newGen: Generation) => {
      setGeneration(newGen);
      // Get a new Pokemon from the selected generation
      setPokemonId(getRandomPokemonIdForGen(newGen, preferredGeneration));
      setGuess("");
      setRevealed(false);
      setIsCorrect(false);
      setHonorSystem(false);
      setShowFirstLetter(false);
      setHintsUsed(0);
    },
    [preferredGeneration],
  );

  const firstLetterHint = useMemo(() => {
    if (!pokemon || !showFirstLetter) return null;
    return pokemon.name[0].toUpperCase();
  }, [pokemon, showFirstLetter]);

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Who&apos;s That Pokemon?</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(16rem,calc(100vw-1.5rem))] space-y-4"
          >
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Difficulty
              </span>
              <Select
                value={difficulty}
                onValueChange={(v) => handleDifficultyChange(v as Difficulty)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      <div className="flex flex-col">
                        <span>{DIFFICULTY_INFO[d].label}</span>
                        <span className="text-xs text-muted-foreground">
                          {DIFFICULTY_INFO[d].description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Generation
              </span>
              <Select
                value={generation}
                onValueChange={(v) => handleGenerationChange(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Generations</SelectItem>
                  {GEN_RANGES.map((gen) => (
                    <SelectItem key={gen.id} value={gen.id}>
                      {gen.name} ({gen.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Score Display */}
      <div className="flex justify-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Trophy className="size-4 text-yellow-500" />
          <span>{score}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="size-4 text-orange-500" />
          <span>{streak}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>Best: {bestStreak}</span>
        </div>
      </div>

      {/* Difficulty and Generation badges */}
      <div className="flex justify-center gap-2 mb-4">
        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
          {DIFFICULTY_INFO[difficulty].label}
        </span>
        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
          {generation === "all"
            ? "All Gens"
            : GEN_RANGES.find((g) => g.id === generation)?.name}
        </span>
      </div>

      {/* Pokemon Silhouette */}
      <div className="relative flex justify-center items-center mb-4 min-h-[200px] bg-muted/30 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="size-48 animate-pulse bg-muted rounded-lg" />
        ) : pokemon ? (
          <div className="relative">
            {/* biome-ignore lint/performance/noImgElement: external sprite URLs */}
            <img
              src={pokemon.sprite}
              alt={revealed ? pokemon.name : "Mystery Pokemon"}
              className={cn(
                "transition-all duration-500 pixelated",
                difficulty === "hard"
                  ? "size-32 scale-150"
                  : "size-48 md:size-56",
                !revealed && "brightness-0",
              )}
            />
            {revealed && !honorSystem && (
              <div
                className={cn(
                  "absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap",
                  isCorrect
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-red-500/20 text-red-600 dark:text-red-400",
                )}
              >
                {isCorrect ? "Correct!" : "Better luck next time!"}
              </div>
            )}
            {honorSystem && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                Did you get it?
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Type hint for easy mode */}
      {difficulty === "easy" && !revealed && pokemon && (
        <div className="flex justify-center gap-1 mb-4">
          {pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      )}

      {/* First letter hint */}
      {showFirstLetter && !revealed && firstLetterHint && (
        <div className="text-center mb-4">
          <span className="text-sm text-muted-foreground">
            Starts with:{" "}
            <span className="font-bold text-foreground">{firstLetterHint}</span>
          </span>
        </div>
      )}

      {/* Pokemon Name (revealed) */}
      {revealed && pokemon && (
        <div className="text-center mb-4">
          <Link
            href={`/pokemon/${toID(pokemon.name)}`}
            className="text-xl font-bold hover:text-primary transition-colors"
          >
            {pokemon.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            #{pokemon.id.toString().padStart(4, "0")}
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Input and Actions */}
      <div className="space-y-3">
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
              className="text-center"
            />
            <div className="flex gap-2">
              <Button
                onClick={checkGuess}
                className="flex-1"
                disabled={!guess.trim()}
              >
                <Check className="size-4 mr-2" />
                Guess
              </Button>
              <Button
                onClick={handleRevealAnswer}
                variant="secondary"
                className="flex-1"
              >
                <SkipForward className="size-4 mr-2" />
                Reveal
              </Button>
            </div>
            {difficulty !== "easy" && (
              <Button
                onClick={handleUseHint}
                variant="outline"
                size="sm"
                disabled={showFirstLetter}
                className="w-full"
              >
                <Lightbulb className="size-4 mr-2" />
                {showFirstLetter ? "Hint used" : "Show first letter (-1 point)"}
              </Button>
            )}
          </>
        ) : honorSystem ? (
          <div className="flex gap-2">
            <Button
              onClick={handleHonorCorrect}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="size-4 mr-2" />I Got It!
            </Button>
            <Button
              onClick={handleHonorIncorrect}
              variant="destructive"
              className="flex-1"
            >
              <X className="size-4 mr-2" />I Didn&apos;t Get It
            </Button>
          </div>
        ) : (
          <Button onClick={handleNext} className="w-full" size="lg">
            <SkipForward className="size-4 mr-2" />
            Next Pokemon
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <HelpCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>Guess the Pokemon from its silhouette!</p>
            <p>
              Points: Easy = 1, Normal = 2, Hard = 3.
              {difficulty !== "easy" && " Using a hint costs 1 point."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
