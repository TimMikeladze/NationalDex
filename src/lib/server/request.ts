import type { ZodType } from "zod";

/**
 * Reads a JSON body and validates it. `null` means the request was not what
 * the route accepts — unparseable JSON, a missing field, a wrong type — and
 * the route should answer 400. That matters for the offline outbox: a 4xx is
 * final and dropped, whereas the 500 a bad body would otherwise turn into
 * gets replayed five times and blocks everything queued behind it.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T | null> {
  const json: unknown = await request.json().catch(() => null);
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}
