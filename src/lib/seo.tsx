import { SITE_URL } from "@/lib/utils";

/** Trail of `{ name, path }` crumbs, root first, current page last. */
export interface Crumb {
  name: string;
  path: string;
}

/**
 * Breadcrumb structured data. Google renders it as the path shown above a
 * result instead of a bare URL, and it tells crawlers how the section pages
 * relate to their children.
 */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/**
 * An index page's contents as an ordered list. Capped because the markup is
 * shipped to every visitor and the first entries are the ones that carry
 * weight — see {@link JSON_LD_LIST_LIMIT}.
 */
export const JSON_LD_LIST_LIMIT = 100;

export function itemListJsonLd(
  name: string,
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.slice(0, JSON_LD_LIST_LIMIT).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Renders JSON-LD. Next moves `<script type="application/ld+json">` into the
 * document head, so this can be dropped anywhere in a server component's tree.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, index) => (
        <script
          // Structured data blocks are static per page, so index is stable.
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          key={index}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
