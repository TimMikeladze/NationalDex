"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSpriteSetGroups, type SpriteSetId } from "@/lib/sprites";
import { cn } from "@/lib/utils";

export interface SpriteSetSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Extra option rendered above every set (e.g. "Default" on the pokemon page). */
  extraOption?: { value: string; label: string };
  className?: string;
  placeholder?: string;
}

/**
 * Sprite set picker listing every supported sprite sheet, grouped by the
 * generation the graphics come from.
 */
export function SpriteSetSelect({
  value,
  onValueChange,
  extraOption,
  className,
  placeholder = "Select",
}: SpriteSetSelectProps) {
  const groups = getSpriteSetGroups();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-52 justify-between", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="end" className="max-h-80">
        {extraOption ? (
          <SelectItem value={extraOption.value}>{extraOption.label}</SelectItem>
        ) : null}
        {groups.map((group) => (
          <SelectGroup key={group.group}>
            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.group}
            </SelectLabel>
            {group.sets.map((set) => (
              <SelectItem key={set.id} value={set.id satisfies SpriteSetId}>
                {set.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
