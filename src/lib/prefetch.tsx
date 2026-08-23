import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

/**
 * Runs the given queries on the server and hands the results to the client
 * cache, so a page whose content lives inside `useQuery` renders as real HTML
 * instead of a loading skeleton. Crawlers see the page; visitors skip the
 * flash of skeletons.
 *
 * The prefetched keys must match what the hooks ask for on their first render —
 * see the note in `@/lib/queries`.
 */
export async function PrefetchBoundary({
  queries,
  children,
}: {
  // Query option objects from `@/lib/queries`; their generics vary per query.
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous query options list
  queries: any[];
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();

  await Promise.all(
    queries.map((query) => queryClient.prefetchQuery(query).catch(() => {})),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
