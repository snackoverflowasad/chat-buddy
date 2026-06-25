import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("fs/promises", () => {
  const m = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
  return { default: m, ...m };
});

import fs from "fs/promises";
import { FileConversationStore } from "../src/storage/adapters/FileConversationStore.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("FileConversationStore", () => {
  let store: FileConversationStore;

  beforeEach(() => {
    store = new FileConversationStore();
    vi.clearAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  test("loadSession filters out messages older than the TTL (24 h by default)", async () => {
    const now = Date.now();
    const messages = [
      { role: "user" as const, content: "stale message", timestamp: now - ONE_DAY_MS * 2 },
      { role: "user" as const, content: "fresh message", timestamp: now - 1_000 },
    ];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(messages) as never);

    const result = await store.loadSession("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("fresh message");
  });

  test("saveSession trims messages to the last 20 (MAX_MESSAGES default)", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `Message ${i}`,
      timestamp: Date.now(),
    }));

    await store.saveSession("user-1", messages);

    const [, written] = vi.mocked(fs.writeFile).mock.calls[0] as [unknown, string];
    const saved = JSON.parse(written);
    expect(saved).toHaveLength(20);
    expect(saved[0].content).toBe("Message 5");
    expect(saved[19].content).toBe("Message 24");
  });

  test("loadSession returns an empty array when the session file does not exist", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    const result = await store.loadSession("nonexistent-user");
    expect(result).toEqual([]);
  });

  test("clearSession removes the session file", async () => {
    await store.clearSession("user-1");
    expect(fs.unlink).toHaveBeenCalledOnce();
  });

  test("clearSession does not throw when the file does not exist", async () => {
    vi.mocked(fs.unlink).mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    await expect(store.clearSession("user-1")).resolves.toBeUndefined();
  });
});
