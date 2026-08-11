import Link from "next/link";

export interface RelatedLinkGroup {
  label: string;
  links: { label: string; href: string }[];
}

/**
 * A plain server-rendered block of links at the foot of a detail page.
 *
 * The interactive dex is a client component, so none of its navigation exists
 * in the HTML a crawler is first served — every route looked like a dead end
 * with no outgoing links. This section is the crawlable link graph: it is real
 * markup, present before any JavaScript runs, and it points at the sibling
 * pages a reader would plausibly want next.
 */
export function RelatedLinks({
  groups,
  heading = "Related pages",
}: {
  groups: RelatedLinkGroup[];
  heading?: string;
}) {
  const populated = groups.filter((group) => group.links.length > 0);
  if (populated.length === 0) return null;

  return (
    <nav
      aria-label={heading}
      className="border-t px-4 py-6 md:px-6 md:py-8 space-y-5"
    >
      <h2 className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {heading}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {populated.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {group.label}
            </h3>
            <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
