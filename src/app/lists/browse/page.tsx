import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { list, listItem } from "@/db/schema";

export const metadata: Metadata = {
  title: "Browse shared lists",
  description: "Public Pokémon lists shared by the NationalDex community.",
};

// Rendered per request: a list shared a minute ago must show up now, and the
// build must not need a database.
export const dynamic = "force-dynamic";

async function getPublicLists() {
  const rows = await db
    .select()
    .from(list)
    .where(and(eq(list.visibility, "public"), isNotNull(list.shareSlug)))
    .orderBy(desc(list.sharedAt));

  if (rows.length === 0) return [];

  const items = await db
    .select({ listId: listItem.listId })
    .from(listItem)
    .where(
      inArray(
        listItem.listId,
        rows.map((row) => row.id),
      ),
    );

  const countByList = new Map<string, number>();
  for (const item of items) {
    countByList.set(item.listId, (countByList.get(item.listId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    itemCount: countByList.get(row.id) ?? 0,
  }));
}

export default async function BrowseListsPage() {
  const lists = await getPublicLists();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-medium">Browse shared lists</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Public lists shared by other trainers
        </p>
      </div>

      {lists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">no public lists yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((row) => (
            <Link key={row.id} href={`/lists/share/${row.shareSlug}`}>
              <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader>
                  <CardTitle>{row.name}</CardTitle>
                  <CardDescription>
                    {row.description ||
                      `${row.itemCount} ${row.itemCount === 1 ? "item" : "items"}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
