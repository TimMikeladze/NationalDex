export type ListItemType =
  | "pokemon"
  | "move"
  | "ability"
  | "item"
  | "type"
  | "card";

export interface ListItem {
  type: ListItemType;
  id: string; // For pokemon: numeric id, for cards: card id, for others: slug name
  name: string;
  sprite?: string | null; // Optional sprite URL
  addedAt: number;
}

export interface List {
  id: string;
  name: string;
  description?: string;
  items: ListItem[];
  createdAt: number;
  updatedAt: number;
}

export const LIST_ITEM_TYPE_LABELS: Record<ListItemType, string> = {
  pokemon: "Pokemon",
  move: "Move",
  ability: "Ability",
  item: "Item",
  type: "Type",
  card: "Card",
};

export const LIST_ITEM_TYPE_COLORS: Record<ListItemType, string> = {
  pokemon: "#EF4444", // red
  move: "#3B82F6", // blue
  ability: "#8B5CF6", // purple
  item: "#F59E0B", // amber
  type: "#22C55E", // green
  card: "#0EA5E9", // sky
};
