import { describe, test, expect } from "vitest";
import { withRequesterContext, getRequestedByFromContext } from "../src/storage/runContext.js";

describe("runContext (AsyncLocalStorage)", () => {
  test("getRequestedByFromContext returns null when called outside a context", () => {
    expect(getRequestedByFromContext()).toBeNull();
  });

  test("withRequesterContext provides the requester id inside the callback", async () => {
    let captured: string | null = null;
    await withRequesterContext("alice@example.com", async () => {
      captured = getRequestedByFromContext();
    });
    expect(captured).toBe("alice@example.com");
  });

  test("context does not leak after the callback exits", async () => {
    await withRequesterContext("alice@example.com", async () => {});
    expect(getRequestedByFromContext()).toBeNull();
  });

  test("nested contexts use the innermost value", async () => {
    let outer: string | null = null;
    let inner: string | null = null;
    let afterInner: string | null = null;

    await withRequesterContext("outer-user", async () => {
      outer = getRequestedByFromContext();
      await withRequesterContext("inner-user", async () => {
        inner = getRequestedByFromContext();
      });
      afterInner = getRequestedByFromContext();
    });

    expect(outer).toBe("outer-user");
    expect(inner).toBe("inner-user");
    // outer context is restored once the inner one exits
    expect(afterInner).toBe("outer-user");
  });

  test("withRequesterContext forwards the callback's return value", async () => {
    const result = await withRequesterContext("user", async () => 42);
    expect(result).toBe(42);
  });

  test("parallel contexts are isolated from each other", async () => {
    const results: string[] = [];

    await Promise.all([
      withRequesterContext("user-a", async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(getRequestedByFromContext() ?? "null");
      }),
      withRequesterContext("user-b", async () => {
        results.push(getRequestedByFromContext() ?? "null");
      }),
    ]);

    expect(results).toContain("user-a");
    expect(results).toContain("user-b");
  });
});
