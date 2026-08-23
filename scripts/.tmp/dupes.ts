import { getAllItems } from "@/lib/pkmn";

for (const g of [1, 2, 3, 6, 9]) {
  const items = getAllItems(g);
  const byNum = new Map<number, string[]>();
  for (const i of items) {
    const a = byNum.get(i.num) ?? [];
    a.push(i.name);
    byNum.set(i.num, a);
  }
  const dupes = [...byNum.entries()].filter(([, v]) => v.length > 1);
  console.log("gen", g, "items", items.length, "dupe nums:", dupes.slice(0, 5));
}
