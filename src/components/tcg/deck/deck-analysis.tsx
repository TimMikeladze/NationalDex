"use client";

import { useMemo } from "react";
import {
  chanceOfAtLeastOne,
  type DeckAnalysis,
  formatPercent,
  prizeSpread,
} from "@/lib/deck";
import { cn } from "@/lib/utils";
import type { Deck, DeckFormat } from "@/types/deck";
import { TCG_ENERGY_COLORS } from "@/types/tcg";
import { EnergyDot } from "../tcg-energy";

/**
 * The numbers a deck is judged by once the sixty cards are in.
 *
 * None of this is the rules — a deck can be perfectly legal and still open on
 * nothing half the time. These are the questions an experienced player asks a
 * list: does it start, does it draw, can it pay for its attacks, and what does
 * the opponent get for knocking it over.
 */
export function DeckAnalysisPanel({
  deck,
  format,
  analysis,
}: {
  deck: Deck;
  format: DeckFormat;
  analysis: DeckAnalysis;
}) {
  const prizes = useMemo(() => prizeSpread(deck), [deck]);

  if (analysis.total === 0) {
    return (
      <p className="px-1 py-8 text-center text-xs text-muted-foreground">
        Add cards and the counts, the opening-hand odds and the energy line
        appear here.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Composition analysis={analysis} format={format} />
      <OpeningHand analysis={analysis} format={format} />
      <Trainers analysis={analysis} format={format} />
      {format.usesEnergyCards ? (
        <EnergyLine analysis={analysis} />
      ) : (
        <EnergyZone analysis={analysis} format={format} />
      )}
      {analysis.lines.length > 0 && <Lines analysis={analysis} />}
      <Board analysis={analysis} format={format} prizes={prizes} />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {hint && (
          <span className="text-[10px] text-muted-foreground/70">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/** The three piles, as the proportions a player pictures a deck in. */
function Composition({
  analysis,
  format,
}: {
  analysis: DeckAnalysis;
  format: DeckFormat;
}) {
  // Measured against the deck this is trying to become: a bar that fills as
  // cards go in says more than three shares of a half-built list.
  const total = Math.max(analysis.total, format.deckSize, 1);
  const segments = [
    { label: "Pokemon", value: analysis.pokemon, color: "bg-emerald-500" },
    { label: "Trainers", value: analysis.trainer, color: "bg-sky-500" },
    { label: "Energy", value: analysis.energy, color: "bg-amber-500" },
  ].filter((segment) => segment.value > 0);

  const guidance = format.guidance;

  return (
    <Section
      title={`${format.deckSize} cards`}
      hint={`${analysis.total} / ${format.deckSize}`}
    >
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.color}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.value} ${segment.label}`}
          />
        ))}
      </div>

      <dl className="grid grid-cols-3 gap-2 pt-1">
        <Stat
          label="Pokemon"
          value={analysis.pokemon}
          hint={`${guidance.pokemonRange[0]}-${guidance.pokemonRange[1]} typical`}
          off={
            analysis.total >= format.deckSize &&
            (analysis.pokemon < guidance.pokemonRange[0] ||
              analysis.pokemon > guidance.pokemonRange[1])
          }
        />
        <Stat
          label="Trainers"
          value={analysis.trainer}
          hint={`${analysis.trainers.Supporter} supporters`}
        />
        <Stat
          label="Energy"
          value={analysis.energy}
          hint={
            guidance.energyRange
              ? `${guidance.energyRange[0]}-${guidance.energyRange[1]} typical`
              : "energy zone"
          }
          off={
            guidance.energyRange !== null &&
            analysis.total >= format.deckSize &&
            (analysis.energy < guidance.energyRange[0] ||
              analysis.energy > guidance.energyRange[1])
          }
        />
      </dl>
    </Section>
  );
}

function Stat({
  label,
  value,
  hint,
  off,
}: {
  label: string;
  value: number | string;
  hint?: string;
  off?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "text-lg font-medium tabular-nums leading-tight",
          off && "text-amber-600 dark:text-amber-500",
        )}
      >
        {value}
      </dd>
      {hint && <p className="text-[10px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/** What a rate of mulligans means to someone holding the deck. */
function mulliganVerdict(odds: number): { label: string; tone: string } {
  if (odds < 0.08) return { label: "rock solid", tone: "text-emerald-600" };
  if (odds < 0.13) return { label: "reliable", tone: "text-emerald-600" };
  if (odds < 0.18) return { label: "workable", tone: "text-foreground" };
  if (odds < 0.25)
    return { label: "shaky", tone: "text-amber-600 dark:text-amber-500" };
  return { label: "too few basics", tone: "text-destructive" };
}

function OpeningHand({
  analysis,
  format,
}: {
  analysis: DeckAnalysis;
  format: DeckFormat;
}) {
  const total = Math.max(analysis.total, format.deckSize);
  const verdict =
    analysis.mulliganOdds !== null
      ? mulliganVerdict(analysis.mulliganOdds)
      : null;

  return (
    <Section title="Opening hand" hint={`${format.openingHand} cards`}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Basics" value={analysis.basicPokemon} />
        {format.guaranteedOpeningBasic ? (
          <Stat
            label="Mulligan"
            value="none"
            hint="a Basic is dealt every game"
          />
        ) : (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mulligan
            </dt>
            <dd
              className={cn(
                "text-lg font-medium tabular-nums leading-tight",
                verdict?.tone,
              )}
            >
              {analysis.mulliganOdds !== null
                ? formatPercent(analysis.mulliganOdds, 1)
                : "—"}
            </dd>
            <p className="text-[10px] text-muted-foreground/80">
              {verdict?.label ?? `fill to ${format.deckSize} to see it`}
            </p>
          </div>
        )}
      </div>

      {/* What a count is worth: the chance a card at that count shows up in the
          opening hand. It is the whole argument between a three-of and a
          four-of, so it is spelled out rather than left to be felt. */}
      <table className="w-full text-[10px] tabular-nums">
        <thead className="text-muted-foreground">
          <tr>
            <th className="text-left font-normal">copies</th>
            {[1, 2, 3, 4].map((count) => (
              <th key={count} className="text-right font-normal">
                {count}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-left text-muted-foreground">in opening hand</td>
            {[1, 2, 3, 4].map((count) => (
              <td key={count} className="text-right">
                {formatPercent(
                  chanceOfAtLeastOne(total, count, format.openingHand),
                )}
              </td>
            ))}
          </tr>
          {/* Pocket sets out no prize cards, so nothing can be prized there. */}
          {format.usesPrizeCards && (
            <tr>
              <td className="text-left text-muted-foreground">prized</td>
              {[1, 2, 3, 4].map((count) => (
                <td key={count} className="text-right">
                  {formatPercent(
                    chanceOfAtLeastOne(total, count, format.prizeCount),
                  )}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </Section>
  );
}

function Trainers({
  analysis,
  format,
}: {
  analysis: DeckAnalysis;
  format: DeckFormat;
}) {
  const rows: [string, number][] = [
    ["Supporters", analysis.trainers.Supporter],
    ["Items", analysis.trainers.Item],
    ["Tools", analysis.trainers.Tool],
    ["Stadiums", analysis.trainers.Stadium],
  ];
  if (analysis.trainers.Trainer > 0) {
    rows.push(["Other", analysis.trainers.Trainer]);
  }

  return (
    <Section
      title="Trainers"
      hint={`${format.guidance.supporterRange[0]}-${format.guidance.supporterRange[1]} supporters`}
    >
      <ul className="space-y-1">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full bg-sky-500"
                style={{
                  width: `${Math.min(100, (value / Math.max(1, format.deckSize / 3)) * 100)}%`,
                }}
              />
            </span>
            <span className="w-6 shrink-0 text-right tabular-nums">
              {value}
            </span>
          </li>
        ))}
      </ul>
      {analysis.trainers.Supporter > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {analysis.drawSupporters} of them draw or search — the turns where the
          deck refills.
        </p>
      )}
      {analysis.switchingCards > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {analysis.switchingCards} card
          {analysis.switchingCards === 1 ? "" : "s"} can move the Active
          Pokemon.
        </p>
      )}
    </Section>
  );
}

function EnergyLine({ analysis }: { analysis: DeckAnalysis }) {
  return (
    <Section
      title="Energy line"
      hint={`${analysis.basicEnergy} basic · ${analysis.specialEnergy} special`}
    >
      {analysis.energyDemand.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No attack in the deck asks for a coloured energy yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {analysis.energyDemand.map((demand) => (
            <li
              key={demand.type}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[10px]",
                demand.supplied
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/10 text-destructive",
              )}
              title={
                demand.supplied
                  ? `${demand.copies} cards attack with ${demand.type} energy`
                  : `${demand.copies} cards need ${demand.type} energy and the deck plays none`
              }
            >
              <EnergyDot type={demand.type} size="sm" />
              {demand.type} {demand.copies}
              {!demand.supplied && " · unpaid"}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Pocket picks its energy at registration rather than drawing it. */
function EnergyZone({
  analysis,
  format,
}: {
  analysis: DeckAnalysis;
  format: DeckFormat;
}) {
  return (
    <Section title="Energy zone" hint={`up to ${format.maxEnergyZoneTypes}`}>
      {analysis.energyDemand.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Add attackers and the types they need show up here.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {analysis.energyDemand.map((demand) => (
            <li
              key={demand.type}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[10px]",
                demand.supplied
                  ? "bg-muted text-muted-foreground"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              <EnergyDot type={demand.type} size="sm" />
              {demand.type} {demand.copies}
              {!demand.supplied && " · unregistered"}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">
        A Pocket deck registers its energy types instead of playing energy
        cards. Fewer types means the right one turns up more often.
      </p>
    </Section>
  );
}

/** The counts a player says out loud: "four-three-three". */
function Lines({ analysis }: { analysis: DeckAnalysis }) {
  return (
    <Section title="Evolution lines">
      <ul className="space-y-1">
        {analysis.lines.map((line) => (
          <li key={line.base} className="flex items-baseline gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate">{line.base}</span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                line.topHeavy && "text-amber-600 dark:text-amber-500",
              )}
              title={line.steps
                .map((step) => `${step.count} ${step.name}`)
                .join(" · ")}
            >
              {line.steps.map((step) => step.count).join("-")}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Board({
  analysis,
  format,
  prizes,
}: {
  analysis: DeckAnalysis;
  format: DeckFormat;
  prizes: { prizes: number; count: number }[];
}) {
  // Pocket scores points rather than taking prize cards, and a Pokemon ex
  // hands over two of them the same way.
  const unit = format.usesPrizeCards ? "prize" : "point";

  return (
    <Section title="On the board">
      <dl className="grid grid-cols-3 gap-2">
        <Stat
          label="Avg HP"
          value={analysis.averageHp ? Math.round(analysis.averageHp) : "—"}
        />
        <Stat
          label="Retreat"
          value={
            analysis.retreat.average !== null
              ? analysis.retreat.average.toFixed(1)
              : "—"
          }
          hint={`${analysis.retreat.free} free`}
        />
        <Stat
          label="Rule box"
          value={analysis.ruleBox}
          hint={`extra ${unit}s`}
        />
      </dl>

      {prizes.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {format.usesPrizeCards ? "Prize trade" : "Point trade"}:{" "}
          {prizes
            .map(
              (entry) =>
                `${entry.count} give up ${entry.prizes} ${unit}${entry.prizes === 1 ? "" : "s"}`,
            )
            .join(", ")}
          .
        </p>
      )}

      {analysis.weaknesses.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Weak to
          </p>
          <ul className="flex flex-wrap gap-1">
            {analysis.weaknesses.slice(0, 5).map((weakness) => (
              <li
                key={weakness.type}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  backgroundColor: `${TCG_ENERGY_COLORS[weakness.type] ?? "#94A3B8"}22`,
                }}
                title={`${weakness.count} Pokemon in the deck are weak to ${weakness.type}`}
              >
                {weakness.type}
                <span className="tabular-nums opacity-70">
                  {weakness.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
