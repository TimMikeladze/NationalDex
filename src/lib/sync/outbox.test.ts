import { beforeEach, describe, expect, test } from "bun:test";

// The outbox only touches `window`/`localStorage`/`fetch` inside functions,
// so a minimal browser shim installed before the tests run is enough.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
  writable: true,
});

/** Records every request and answers each with the next queued status. */
const sent: { method: string; url: string }[] = [];
let responses: (number | "offline")[] = [];
/** When set, the next request blocks until `releaseHeldRequest` is called. */
let hold: Promise<void> | null = null;
let releaseHeldRequest: () => void = () => {};
function holdNextRequest() {
  hold = new Promise<void>((resolve) => {
    releaseHeldRequest = resolve;
  });
}
globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
  sent.push({ method: init?.method ?? "GET", url: String(url) });
  if (hold) {
    const held = hold;
    hold = null;
    await held;
  }
  const next = responses.shift() ?? 200;
  if (next === "offline") throw new TypeError("Failed to fetch");
  return new Response(null, { status: next });
}) as typeof fetch;

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const { flushQueue, hasPendingWrites, queuedCount, syncWrite } = await import(
  "./outbox"
);

let resourceCounter = 0;
/** A fresh resource per test so module-level state never bleeds between them. */
let resource = "";

beforeEach(() => {
  storage.clear();
  sent.length = 0;
  responses = [];
  hold = null;
  resourceCounter += 1;
  resource = `test-${resourceCounter}`;
});

describe("syncWrite", () => {
  test("delivers directly when nothing is queued", async () => {
    responses = [200];
    const delivered = await syncWrite(resource, {
      method: "POST",
      path: "/api/x",
    });
    expect(delivered).toBe(true);
    expect(queuedCount(resource)).toBe(0);
    expect(hasPendingWrites(resource)).toBe(false);
  });

  test("queues on a network failure and reports it as pending", async () => {
    responses = ["offline", "offline"];
    const delivered = await syncWrite(resource, {
      method: "DELETE",
      path: "/api/x/1",
    });
    expect(delivered).toBe(false);
    expect(queuedCount(resource)).toBe(1);
    expect(hasPendingWrites(resource)).toBe(true);
  });

  test("queues a 401 for replay instead of dropping it", async () => {
    responses = [401, 401];
    const delivered = await syncWrite(resource, {
      method: "POST",
      path: "/api/x",
    });
    expect(delivered).toBe(false);
    expect(queuedCount(resource)).toBe(1);
  });

  test("a 4xx is final — acknowledged, not queued", async () => {
    responses = [404];
    const delivered = await syncWrite(resource, {
      method: "PATCH",
      path: "/api/x/1",
    });
    expect(delivered).toBe(true);
    expect(queuedCount(resource)).toBe(0);
  });

  test("writes to one resource go out one at a time, in call order", async () => {
    responses = [200, 200];
    holdNextRequest();
    const first = syncWrite(resource, { method: "POST", path: "/api/lists" });
    const second = syncWrite(resource, {
      method: "POST",
      path: "/api/lists/1/items",
    });
    await tick();
    // The item POST must not leave until the list POST has been answered.
    expect(sent.map((req) => req.url)).toEqual(["/api/lists"]);
    expect(hasPendingWrites(resource)).toBe(true);

    releaseHeldRequest();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(sent.map((req) => req.url)).toEqual([
      "/api/lists",
      "/api/lists/1/items",
    ]);
    expect(hasPendingWrites(resource)).toBe(false);
  });

  test("a later write goes behind an existing queue, not ahead of it", async () => {
    responses = ["offline", "offline"];
    await syncWrite(resource, { method: "POST", path: "/api/decks" });
    expect(queuedCount(resource)).toBe(1);

    // Still offline for the replay attempt this triggers.
    responses = ["offline"];
    await syncWrite(resource, {
      method: "PATCH",
      path: "/api/decks/1/entries",
    });
    expect(queuedCount(resource)).toBe(2);

    // Back online: both land, in order.
    sent.length = 0;
    responses = [200, 200];
    await flushQueue(resource);
    expect(sent.map((req) => req.url)).toEqual([
      "/api/decks",
      "/api/decks/1/entries",
    ]);
    expect(queuedCount(resource)).toBe(0);
  });
});

describe("flushQueue", () => {
  test("stops at a 5xx and keeps the op for the next attempt", async () => {
    responses = ["offline", "offline"];
    await syncWrite(resource, { method: "POST", path: "/api/a" });
    responses = ["offline"];
    await syncWrite(resource, { method: "POST", path: "/api/b" });

    sent.length = 0;
    responses = [500];
    await flushQueue(resource);
    expect(sent.map((req) => req.url)).toEqual(["/api/a"]);
    expect(queuedCount(resource)).toBe(2);
  });

  test("drops a poison op after repeated 5xx and carries on", async () => {
    responses = ["offline", "offline"];
    await syncWrite(resource, { method: "POST", path: "/api/poison" });
    responses = ["offline"];
    await syncWrite(resource, { method: "POST", path: "/api/fine" });

    for (let attempt = 0; attempt < 4; attempt++) {
      responses = [500];
      await flushQueue(resource);
      expect(queuedCount(resource)).toBe(2);
    }

    sent.length = 0;
    responses = [500, 200];
    await flushQueue(resource);
    expect(sent.map((req) => req.url)).toEqual(["/api/poison", "/api/fine"]);
    expect(queuedCount(resource)).toBe(0);
  });

  test("keeps a write that arrives while a replay is in flight", async () => {
    responses = ["offline", "offline"];
    await syncWrite(resource, { method: "POST", path: "/api/a" });
    expect(queuedCount(resource)).toBe(1);

    // Reconnect: the replay of /api/a is held mid-flight...
    sent.length = 0;
    responses = [200, 200];
    holdNextRequest();
    const replay = flushQueue(resource);
    await tick();
    expect(sent.map((req) => req.url)).toEqual(["/api/a"]);

    // ...and the user makes another change meanwhile.
    const delivered = await syncWrite(resource, {
      method: "POST",
      path: "/api/b",
    });
    expect(delivered).toBe(false);
    expect(queuedCount(resource)).toBe(2);

    releaseHeldRequest();
    await replay;
    expect(sent.map((req) => req.url)).toEqual(["/api/a", "/api/b"]);
    expect(queuedCount(resource)).toBe(0);
  });
});
